import {
  type Message,
  createDataStreamResponse,
} from 'ai';

import { getServerSession } from '@/lib/auth';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
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
} from '@/lib/utils';
import type { ExtendedAttachment } from '@/types';

import { generateTitleFromUserMessage } from '../../actions';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Detailed error logging
const logError = (error: any, context: string) => {
  console.error(`[ERROR] ${context}:`, error);
  if (error.response) {
    console.error(`Response status: ${error.response.status}`);
    try {
      console.error(`Response data:`, error.response.data);
    } catch (e) {
      console.error(`Could not log response data:`, e);
    }
  }
};

// At the top of the file after the imports, add these type definitions
interface ResponseInputItem {
  role: 'user' | 'assistant' | 'system';
  content: string | { type: string; [key: string]: any }[];
}

type ResponseInput = ResponseInputItem[];

export async function POST(request: Request) {
  try {
    // Validate request body exists
    if (!request.body) {
      console.error('[API] Error: Missing request body');
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }

    // Parse request with error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error('[API] Error parsing request JSON:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const {
      id,
      messages = [], // Provide a default empty array if messages is undefined
      selectedChatModel,
      experimental_attachments,
      data
    }: { 
      id: string; 
      messages?: Array<Message>; // Make messages optional
      selectedChatModel: string;
      experimental_attachments?: ExtendedAttachment[];
      data?: {
        agentType?: string;
        input?: string;
      };
    } = requestData;

    // Validate critical parameters
    if (!id) {
      console.error('[API] Error: Missing chat ID');
      return NextResponse.json({ error: 'Missing chat ID' }, { status: 400 });
    }

    // Validate that messages is an array
    if (!Array.isArray(messages)) {
      console.error('[API] Error: Invalid messages format - not an array');
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Extract agent type from request data if present
    const agentType = data?.agentType || 'default';
    
    console.log(`[API] Chat request with model: ${selectedChatModel}${agentType !== 'default' ? `, agent: ${agentType}` : ''}`);

    // Verify authentication with clear error messages
    const session = await getServerSession();
    if (!session) {
      console.error('[API] Error: No session found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!session.user || !session.user.id) {
      console.error('[API] Error: Invalid session - missing user ID');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Validate the selected model
    let modelToUse = DEFAULT_CHAT_MODEL;
    try {
      console.log(`[API] Validating model: ${selectedChatModel}`);
      const validModel = chatModels.some(model => model.id === selectedChatModel);
      modelToUse = validModel ? selectedChatModel : DEFAULT_CHAT_MODEL;
      
      if (!validModel) {
        console.warn(`[API] Warning: Invalid model requested (${selectedChatModel}), falling back to ${DEFAULT_CHAT_MODEL}`);
      }
    } catch (validationError) {
      console.error(`[API] Error during model validation:`, validationError);
      // Continue with default model but log the error
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
      // Only return an error if this isn't an empty initialization request
      if (messages.length > 0) {
        console.log(`[API] Error: No user message found in ${messages.length} messages`);
        return NextResponse.json({ error: 'No user message found' }, { status: 400 });
      }
      
      // For empty initialization requests, we'll just create or return the chat without an error
      console.log(`[API] Chat initialization without messages for ID: ${id}`);
    }

    // Get or create the chat
    let chat;
    try {
      chat = await getChatById({ id });
    } catch (dbError) {
      console.error('[API] Database error when fetching chat:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!chat) {
      try {
        // For new chats with only artifacts, use a generic title
        let title = 'New Chat';
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
      } catch (saveError) {
        console.error('[API] Error saving new chat:', saveError);
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
      }
    }

    // Save the user message to the database (if any)
    if (userMessage) {
      try {
        await saveMessages({
          messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
        });
      } catch (saveError) {
        console.error('[API] Error saving user message:', saveError);
        // Continue despite the error to attempt to get a response
      }
    }

    // Find document artifacts in messages and save them if they're new
    const documentMessages = messages.filter(message => 
      message.role === 'system' && 'documentId' in message && message.documentId
    );
    
    if (documentMessages.length > 0) {
      try {
        await saveMessages({
          messages: documentMessages.map(message => ({
            ...message,
            chatId: id,
            createdAt: new Date(),
          })),
        });
      } catch (saveError) {
        console.error('[API] Error saving document messages:', saveError);
        // Continue despite the error to attempt to get a response
      }
    }

    // If there's no user message yet (just artifacts), we're done
    if (!userMessage) {
      return NextResponse.json({ 
        success: true, 
        message: 'Artifacts saved' 
      });
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          // Format messages for the OpenAI Responses API properly
          // This uses the string format for compatibility with the Responses API
          
          // Convert to a simple string format since the Responses API
          // has specific requirements for the input format
          let promptText = "";
          
          // Add system message if available
          const systemInstructions = systemPrompt({ selectedChatModel });
          if (systemInstructions) {
            promptText += `System: ${systemInstructions}\n\n`;
          }
          
          // Add all conversation messages with proper roles
          for (const message of messages) {
            // Skip system messages with documentId as they are for internal use
            if (message.role === 'system' && 'documentId' in message) {
              continue;
            }
            
            // Add all other messages with their proper roles
            if (message.role === 'user') {
              promptText += `User: ${message.content}\n\n`;
            } else if (message.role === 'assistant') {
              promptText += `Assistant: ${message.content}\n\n`;
            }
          }
          
          console.log(`[API] Using model: ${modelToUse}, with formatted prompt of length: ${promptText.length}`);
          
          // Setup tools based on agent type
          const tools = agentType === 'research' ? 
            [{ type: 'web_search_preview' as const }] : 
            undefined;
          
          try {
            // Map our internal model names to OpenAI model names
            const openaiModel = modelToUse === 'gpt-o1' ? 'gpt-4o' : 
                    modelToUse === 'gpt-40' ? 'gpt-4o' : 
                    'gpt-4o-mini';
                    
            console.log(`[API] Calling OpenAI with model: ${openaiModel}`);
            
            // Validate OpenAI API key
            if (!process.env.OPENAI_API_KEY) {
              throw new Error('OpenAI API key is missing');
            }
            
            // Use the OpenAI Responses API with the properly formatted input
            // For streaming, we'll manually handle the chunks to match our expected format
            const response = await openai.responses.create({
              model: openaiModel,
              input: promptText, // Use the string format as documented
              tools,
              stream: false // We'll handle our own streaming simulation
            });
            
            if (!response.output_text) {
              throw new Error('No output received from the model');
            }
            
            const responseText = response.output_text;
            console.log(`[API] Received response with length: ${responseText.length}`);
            
            // Simulate streaming by sending chunks of text
            const chunkSize = 10;
            for (let i = 0; i < responseText.length; i += chunkSize) {
              const chunk = responseText.substring(i, i + chunkSize);
              
              dataStream.writeData({
                type: 'message',
                message: {
                  id: generateUUID(),
                  role: 'assistant',
                  content: chunk,
                }
              });
              
              // Add a small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Save the complete response
            try {
              await saveMessages({
                messages: [{
                  id: generateUUID(),
                  role: 'assistant',
                  content: responseText,
                  createdAt: new Date(),
                  chatId: id,
                }],
              });
              
              console.log(`[API] Saved response with length: ${responseText.length}`);
            } catch (saveError) {
              console.error('[API] Error saving response message:', saveError);
              // Continue anyway since the user already got the response in the UI
            }
            
          } catch (error) {
            logError(error, 'Error with OpenAI API');
            
            // Check if this is a rate limit or quota error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || 
                               errorMessage.toLowerCase().includes('quota');
            const isAuthError = errorMessage.toLowerCase().includes('auth') || 
                               errorMessage.toLowerCase().includes('api key') ||
                               errorMessage.toLowerCase().includes('invalid key');
                               
            // Use a descriptive error message based on error type
            let userErrorMessage;
            if (isRateLimit) {
              userErrorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (isAuthError) {
              userErrorMessage = 'Authentication error with AI provider. Please check your account.';
            } else {
              userErrorMessage = `Error: ${errorMessage}`;
            }
            
            // Log detailed error information
            console.error('[API] OpenAI API error:', {
              message: errorMessage,
              isRateLimit,
              isAuthError
            });
            
            // Notify the client about the error
            dataStream.writeData({
              type: 'error',
              error: userErrorMessage
            });
            
            // Try again with fallback model
            try {
              console.log('[API] Attempting fallback with gpt-4o-mini');
              
              // Use the same properly formatted input for the fallback
              const fallbackResponse = await openai.responses.create({
                model: 'gpt-4o-mini',
                input: promptText // Use the string format
              });
              
              if (!fallbackResponse.output_text) {
                throw new Error('No output received from fallback model');
              }
              
              const responseText = fallbackResponse.output_text;
              
              if (responseText) {
                console.log(`[API] Fallback successful with response length: ${responseText.length}`);
                
                // Stream the fallback response to the client
                dataStream.writeData({
                  type: 'message',
                  message: {
                    id: generateUUID(),
                    role: 'assistant',
                    content: responseText,
                  }
                });
                
                // Save the fallback response
                try {
                  await saveMessages({
                    messages: [{
                      id: generateUUID(),
                      role: 'assistant',
                      content: responseText,
                      createdAt: new Date(),
                      chatId: id,
                    }],
                  });
                } catch (saveError) {
                  console.error('[API] Error saving fallback response:', saveError);
                  // Continue anyway since the user already got the response in the UI
                }
              }
              
            } catch (fallbackError) {
              logError(fallbackError, 'Fallback also failed');
              const fallbackErrorMessage = fallbackError instanceof Error 
                ? fallbackError.message 
                : 'Unknown error';
              
              // Send a clear error to the client
              dataStream.writeData({
                type: 'error',
                error: `All models failed. Please try again later. (Error: ${fallbackErrorMessage})` 
              });
            }
          }
          
        } catch (error) {
          logError(error, 'Unexpected error in stream handling');
          
          // Create a more user-friendly error message
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const userMessage = `An error occurred while processing your request. Please try again. (${errorMessage})`;
          
          // Send a clear error to the client
          dataStream.writeData({
            type: 'error',
            error: userMessage
          });
        }
      },
      onError: (error: unknown) => {
        logError(error, 'Chat API error in dataStream');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return `Sorry, an error occurred while processing your request: ${errorMessage}. Please try again.`;
      },
    });
  } catch (error) {
    logError(error, 'Unexpected error in chat API');
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteChatById({ id });

    return NextResponse.json({ message: 'Chat deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}



