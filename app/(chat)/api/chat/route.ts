import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { myProvider, DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';
import type { ExtendedAttachment } from '@/types';

import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';

export const maxDuration = 60;

// Maximum size for file content in characters
const MAX_FILE_CONTENT_SIZE = 10000;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
    experimental_attachments,
  }: { 
    id: string; 
    messages: Array<Message>; 
    selectedChatModel: string;
    experimental_attachments?: ExtendedAttachment[];
  } = await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Validate the selected model
  const validModel = chatModels.some(model => model.id === selectedChatModel);
  const modelToUse = validModel ? selectedChatModel : DEFAULT_CHAT_MODEL;

  // Check if there are any document artifact messages
  const hasArtifacts = messages.some(message => 
    message.role === 'system' && 'documentId' in message && message.documentId
  );

  // Find the most recent user message
  const userMessage = getMostRecentUserMessage(messages);

  // If there's no user message but there are artifacts, this is an initial artifact-only state
  // We'll create a chat but won't require a user message yet
  if (!userMessage && !hasArtifacts) {
    return new Response('No user message found', { status: 400 });
  }

  try {
    // Get or create the chat
    const chat = await getChatById({ id });

    if (!chat) {
      // For new chats with only artifacts, use a generic title
      let title = 'New Document';
      if (userMessage) {
        title = await generateTitleFromUserMessage({ message: userMessage });
      } else if (hasArtifacts) {
        // Try to use the artifact title if available
        const artifactMessage = messages.find(message => 
          message.role === 'system' && 'artifactTitle' in message
        );
        if (artifactMessage && 'artifactTitle' in artifactMessage) {
          title = `Document: ${artifactMessage.artifactTitle}`;
        }
      }
      
      await saveChat({ id, userId: session.user.id, title });
    }

    // Save the user message to the database (if any)
    if (userMessage) {
      await saveMessages({
        messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
      });
    }

    // Find document artifacts in messages and save them if they're new
    const documentMessages = messages.filter(message => 
      message.role === 'system' && 'documentId' in message && message.documentId
    );
    
    if (documentMessages.length > 0) {
      await saveMessages({
        messages: documentMessages.map(message => ({
          ...message,
          chatId: id,
          createdAt: new Date(),
        })),
      });
    }

    // If there's no user message yet (just artifacts), we're done
    if (!userMessage) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Artifacts saved' 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use the base system prompt without any file content modifications
    const enhancedSystemPrompt = (model: string) => {
      return systemPrompt({ selectedChatModel: model });
    };

    // Filter messages for the model to avoid token waste
    // We need to filter out system messages with document artifacts
    // but keep the messages that are needed for conversation history
    const filteredMessages = messages.filter(message => {
      // Keep all user and assistant messages for conversation history
      if (message.role === 'user' || message.role === 'assistant') {
        return true;
      }
      
      // Filter out system messages with document artifacts
      if (message.role === 'system' && 'documentId' in message) {
        return false;
      }
      
      // Keep any other system messages
      return true;
    });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        let currentModel = modelToUse;
        let retryCount = 0;
        const maxRetries = 2;
        
        const executeStreamText = async () => {
          try {
            const result = streamText({
              model: myProvider.languageModel(currentModel),
              system: enhancedSystemPrompt(currentModel),
              messages: filteredMessages,
              maxSteps: currentModel === 'gpt-o1' ? 10 : 5,
              experimental_activeTools:
                currentModel === 'chat-model-reasoning'
                  ? []
                  : [
                      'getWeather',
                      'createDocument',
                      'updateDocument',
                      'requestSuggestions',
                    ],
              experimental_transform: smoothStream({ chunking: 'word' }),
              experimental_generateMessageId: generateUUID,
              tools: {
                getWeather,
                createDocument: createDocument({ session, dataStream }),
                updateDocument: updateDocument({ session, dataStream }),
                requestSuggestions: requestSuggestions({
                  session,
                  dataStream,
                }),
              },
              onFinish: async ({ response, reasoning }) => {
                if (session.user?.id) {
                  try {
                    const sanitizedResponseMessages = sanitizeResponseMessages({
                      messages: response.messages,
                      reasoning,
                    });

                    await saveMessages({
                      messages: sanitizedResponseMessages.map((message) => {
                        return {
                          id: message.id,
                          chatId: id,
                          role: message.role,
                          content: message.content,
                          createdAt: new Date(),
                        };
                      }),
                    });
                  } catch (error) {
                    console.error('Failed to save chat');
                  }
                }
              },
              experimental_telemetry: {
                isEnabled: true,
                functionId: 'stream-text',
              },
            });

            result.mergeIntoDataStream(dataStream, {
              sendReasoning: true,
            });
            
            return result;
          } catch (error) {
            if (retryCount < maxRetries && currentModel === 'gpt-o1') {
              retryCount++;
              console.warn(`Error with model ${currentModel}, retrying (${retryCount}/${maxRetries})...`);
              
              // If we've reached max retries, fall back to the default model
              if (retryCount === maxRetries) {
                console.warn(`Falling back to ${DEFAULT_CHAT_MODEL} after ${maxRetries} failed attempts with ${currentModel}`);
                currentModel = DEFAULT_CHAT_MODEL;
              }
              
              return executeStreamText();
            }
            
            throw error;
          }
        };
        
        await executeStreamText();
      },
      onError: (error: unknown) => {
        console.error('Chat API error:', error);
        if (error instanceof Error && error.message && error.message.includes('context length')) {
          return 'The file content is too large for the model to process. Please try with a smaller file or extract the most relevant parts.';
        }
        return 'Oops, an error occurred while processing your request. Please try again with a smaller file or different content.';
      },
    });
  } catch (error: unknown) {
    console.error('Unexpected error in chat API:', error);
    return new Response('An unexpected error occurred. Please try again.', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
