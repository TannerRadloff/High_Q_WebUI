import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  saveDocument,
  getDocumentById,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';
import { ExtendedAttachment } from '@/types';

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

    // Create a clean array of messages for the API
    // First, filter out document system messages
    let apiMessages = messages.filter(message => 
      !(message.role === 'system' && 'documentId' in message)
    );

    // Now retrieve and prepend document content as user messages to the conversation
    // These will be visible to the model but not saved to the database
    const documentContextMessages: Message[] = [];
    for (const docMessage of documentMessages) {
      if (docMessage && 'documentId' in docMessage && docMessage.documentId) {
        try {
          const documentId = String(docMessage.documentId);
          console.log(`Retrieving document with ID: ${documentId}`);
          const document = await getDocumentById({ id: documentId });
          
          if (document) {
            const contentLength = document.content?.length || 0;
            console.log(`Found document: ${document.title}, Content length: ${contentLength} chars`);
            
            // Check if we have valid content
            const content = document.content || `[No content available for document: ${document.title}]`;
            
            // Ensure content isn't too large (OpenAI has token limits)
            const trimmedContent = content.length > 10000 ? content.substring(0, 10000) + "... [content truncated due to length]" : content;
            
            // Add the document content as a user message at the start of the conversation
            const contentPreview = trimmedContent.substring(0, 100) + '...';
            console.log(`Adding document content to conversation: ${contentPreview}`);
            
            documentContextMessages.push({
              id: generateUUID(),
              role: 'user',
              content: `Document: ${document.title}\n\n${trimmedContent}`,
              createdAt: new Date(Date.now() - 60000) // Make it appear earlier
            });
            
            // Add an assistant acknowledgment to create a proper conversation flow
            documentContextMessages.push({
              id: generateUUID(),
              role: 'assistant',
              content: `I've received the document "${document.title}". I'll use this information to help answer your questions.`,
              createdAt: new Date(Date.now() - 50000) // Make it appear earlier
            });
          } else {
            console.log(`Document with ID ${documentId} not found`);
          }
        } catch (error) {
          console.error('Error retrieving document for context:', error);
        }
      }
    }

    // Combine document context messages with regular messages
    if (documentContextMessages.length > 0) {
      // Place document context at the beginning of the conversation
      apiMessages = [...documentContextMessages, ...apiMessages];
      console.log(`Added ${documentContextMessages.length} document context messages to the conversation`);
      console.log(`Total message count: ${apiMessages.length}`);
      // Log the roles of all messages to verify structure
      console.log(`Message roles sequence: ${apiMessages.map(m => m.role).join(', ')}`);
    }

    // Use the standard system prompt
    const enhancedSystemPrompt = (model: string) => {
      const prompt = systemPrompt({ selectedChatModel: model });
      console.log(`Using system prompt: ${prompt.substring(0, 100)}...`);
      return prompt;
    };

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: enhancedSystemPrompt(selectedChatModel),
          messages: apiMessages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
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

