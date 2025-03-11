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

// Add detailed logging function
const logError = (error: any, context: string) => {
  console.error(`[API ERROR] ${context}:`, error);
  
  if (error instanceof Error) {
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    
    if ('cause' in error) {
      console.error(`Error cause:`, error.cause);
    }
    
    // Check for specific OpenAI API errors
    if (error.message && error.message.includes('OpenAI')) {
      console.error(`OpenAI API error detected`);
      
      // Extract status code if available
      const statusMatch = error.message.match(/status (\d+)/);
      if (statusMatch) {
        console.error(`OpenAI API status code: ${statusMatch[1]}`);
      }
      
      // Log if it's a model-specific error
      if (error.message.includes('model')) {
        console.error(`Model-specific error detected`);
        
        // Check for o1 model errors specifically
        if (error.message.includes('o1') || 
            error.message.includes('gpt-4o-2024') || 
            error.message.includes('does not exist') ||
            error.message.includes('access')) {
          console.error(`O1 model access error detected. Please check your API key permissions.`);
          console.error(`Attempted model access error: ${error.message}`);
        }
      }
    } else {
      console.error(`Non-Error object:`, error);
    }
  }
  
  // Log request context if available
  if (typeof error === 'object' && error !== null && 'config' in error) {
    console.error(`Request URL: ${(error as any).config?.url}`);
    console.error(`Request method: ${(error as any).config?.method}`);
    console.error(`Request headers:`, (error as any).config?.headers);
  }
};

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

  console.log(`[API] Chat request with model: ${selectedChatModel}`);

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Validate the selected model
  let modelToUse = DEFAULT_CHAT_MODEL;
  try {
    console.log(`[API] Validating model: ${selectedChatModel}`);
    const validModel = chatModels.some(model => model.id === selectedChatModel);
    modelToUse = validModel ? selectedChatModel : DEFAULT_CHAT_MODEL;
    
    // Verify that the model can be initialized
    if (validModel) {
      try {
        const model = myProvider.languageModel(selectedChatModel);
        console.log(`[API] Successfully validated model: ${selectedChatModel}`);
      } catch (modelError) {
        console.error(`[API] Error initializing model ${selectedChatModel}:`, modelError);
        
        // Special handling for o1 model errors
        if (selectedChatModel === 'gpt-o1') {
          console.error(`[API] O1 model initialization failed. Falling back to gpt-40.`);
          modelToUse = 'gpt-40'; // Fallback to gpt-40 instead of the default mini model
        } else {
          modelToUse = DEFAULT_CHAT_MODEL;
        }
      }
    }
  } catch (validationError) {
    console.error(`[API] Error during model validation:`, validationError);
    
    // Special handling for o1 model errors
    if (selectedChatModel === 'gpt-o1') {
      console.error(`[API] O1 model validation failed. Falling back to gpt-40.`);
      modelToUse = 'gpt-40'; // Fallback to gpt-40 instead of the default mini model
    } else {
      modelToUse = DEFAULT_CHAT_MODEL;
    }
  }

  console.log(`[API] Using model: ${modelToUse} (selected: ${selectedChatModel})`);

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
        
        console.log(`[API] Starting stream with model: ${currentModel}`);
        
        const executeStreamText = async () => {
          try {
            console.log(`[API] Executing streamText with model: ${currentModel}`);
            
            // Add detailed logging for GPT-o1 model
            if (currentModel === 'gpt-o1') {
              console.log(`[API] Using GPT-o1 model with maxSteps: 30 for advanced reasoning`);
              
              try {
                const modelString = myProvider.languageModel(currentModel).toString();
                console.log(`[API] Model mapping: ${currentModel} -> ${modelString}`);
              } catch (modelError) {
                console.error(`[API] Error getting model string for ${currentModel}:`, modelError);
              }
              
              // Add specific warning for o1 model
              dataStream.writeData({
                type: 'message',
                message: {
                  id: generateUUID(),
                  role: 'system',
                  content: 'Using the advanced GPT-o1 model. This model may take longer to respond but provides enhanced reasoning capabilities.',
                }
              });
            }
            
            // Initialize the model before using it to catch any initialization errors
            const model = myProvider.languageModel(currentModel);
            console.log(`[API] Successfully initialized model: ${currentModel}`);
            
            // Enhanced system prompt for o1 model with reasoning framework instructions
            let systemPromptContent = enhancedSystemPrompt(currentModel);
            
            const result = streamText({
              model: model,
              system: systemPromptContent,
              inputs: filteredMessages,
              maxSteps: currentModel === 'gpt-o1' ? 30 : 5, // Increased steps for o1 model
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
                console.log(`[API] Stream finished successfully with model: ${currentModel}`);
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
                          content: message.content && typeof message.content === 'string' 
                            ? message.content 
                            : Array.isArray(message.content) 
                              ? message.content.find(item => item.type === 'output_text')?.text || '' 
                              : '',
                          createdAt: new Date(),
                        };
                      }),
                    });
                  } catch (error) {
                    logError(error, 'Failed to save chat messages');
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
            logError(error, `Error streaming with model ${currentModel}`);
            
            // Add more detailed error logging for debugging
            console.error(`[API] Detailed error for model ${currentModel}:`);
            
            // Check for specific OpenAI API errors
            if (error instanceof Error) {
              // Check if it's a model-specific error
              if (error.message.includes('model')) {
                console.error(`[API] Model error detected: ${error.message}`);
                
                if (currentModel === 'gpt-o1') {
                  console.error(`[API] GPT-o1 model error detected. Here are additional details:`);
                  
                  // Check for common o1 specific errors
                  if (error.message.includes('not found') || 
                      error.message.includes('does not exist') || 
                      error.message.includes('do not have access')) {
                    console.error(`[API] The o1 model ID may be incorrect or not accessible. Error: ${error.message}`);
                    
                    // Inform the user about the specific error
                    dataStream.writeData({
                      type: 'message',
                      message: {
                        id: generateUUID(),
                        role: 'system',
                        content: 'The GPT-o1 model is not available with your current API key. Falling back to an alternative model.',
                      }
                    });
                    
                    // Immediately switch to gpt-4o for a better fallback experience
                    currentModel = 'gpt-40';
                    console.log(`[API] Immediately falling back to ${currentModel} due to access error`);
                    
                    // Skip retry attempts for access errors
                    return executeStreamText();
                    
                  } else if (error.message.includes('permission') || error.message.includes('access')) {
                    console.error(`[API] Permission or access error for o1 model. Ensure your API key has access to o1.`);
                    
                    // Inform the user about the specific error
                    dataStream.writeData({
                      type: 'message',
                      message: {
                        id: generateUUID(),
                        role: 'system',
                        content: 'Your account does not have access to the GPT-o1 model. Falling back to an alternative model.',
                      }
                    });
                    
                  } else if (error.message.includes('capacity') || error.message.includes('overloaded')) {
                    console.error(`[API] The o1 model appears to be at capacity or overloaded.`);
                    
                    // Inform the user about the specific error
                    dataStream.writeData({
                      type: 'message',
                      message: {
                        id: generateUUID(),
                        role: 'system',
                        content: 'The GPT-o1 model is currently at capacity. Falling back to an alternative model.',
                      }
                    });
                  } else if (error.message.includes('version')) {
                    console.error(`[API] API version error. The o1 model may require a specific API version.`);
                  }
                }
              }
              
              // Check for rate limit errors
              if (error.message.includes('rate limit')) {
                console.error(`[API] Rate limit error detected: ${error.message}`);
              }
              
              // Check for context length errors
              if (error.message.includes('context length')) {
                console.error(`[API] Context length error detected: ${error.message}`);
              }
              
              // Check for API key errors
              if (error.message.includes('api key') || error.message.includes('authentication')) {
                console.error(`[API] API key or authentication error: ${error.message}`);
              }
            }
            
            if (retryCount < maxRetries && currentModel === 'gpt-o1') {
              retryCount++;
              console.warn(`[API] Error with model ${currentModel}, retrying (${retryCount}/${maxRetries}) after delay...`);
              
              // Add a delay before retrying to allow for potential rate limit recovery
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive backoff
              
              // If we've reached max retries, fall back to the default model
              if (retryCount === maxRetries) {
                console.warn(`[API] Falling back to ${DEFAULT_CHAT_MODEL} after ${maxRetries} failed attempts with ${currentModel}`);
                currentModel = DEFAULT_CHAT_MODEL;
                
                // Inform the user about the fallback
                dataStream.writeData({
                  type: 'message',
                  message: {
                    id: generateUUID(),
                    role: 'assistant',
                    content: `I encountered an issue with the advanced ${selectedChatModel} model and have switched to a more reliable alternative. I'll still do my best to help you with your request.`,
                  }
                });
              }
              
              return executeStreamText();
            }
            
            throw error;
          }
        };
        
        await executeStreamText();
      },
      onError: (error: unknown) => {
        logError(error, 'Chat API error in dataStream');
        
        // Add more detailed error logging for debugging
        if (error instanceof Error) {
          // Check if it's a model-specific error
          if (error.message.includes('model')) {
            console.error(`[API] Model error detected in onError handler: ${error.message}`);
          }
          
          // Check for rate limit errors
          if (error.message.includes('rate limit')) {
            console.error(`[API] Rate limit error detected in onError handler: ${error.message}`);
          }
          
          // Check for context length errors
          if (error.message.includes('context length')) {
            console.error(`[API] Context length error detected in onError handler: ${error.message}`);
            return 'The file content is too large for the model to process. Please try with a smaller file or extract the most relevant parts.';
          }
        }
        
        return `Oops, an error occurred while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a smaller file or different content.`;
      },
    });
  } catch (error: unknown) {
    logError(error, 'Unexpected error in chat API');
    return new Response(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, { status: 500 });
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

