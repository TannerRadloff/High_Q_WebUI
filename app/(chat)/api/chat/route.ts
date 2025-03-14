import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { getServerSession } from '@/lib/auth';
import { DEFAULT_CHAT_MODEL, chatModels, openaiResponses } from '@/lib/ai/models';
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
import { NextResponse } from 'next/server';

export const maxDuration = 60;

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

// Maximum size for file content in characters
const MAX_FILE_CONTENT_SIZE = 10000;

export async function POST(request: Request) {
  try {
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
      };
    } = await request.json();

    // Validate that messages is an array
    if (!Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    // Extract agent type from request data if present
    const agentType = data?.agentType || 'default';
    
    console.log(`[API] Chat request with model: ${selectedChatModel}${agentType !== 'default' ? `, agent: ${agentType}` : ''}`);

    const session = await getServerSession();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Validate the selected model
    let modelToUse = DEFAULT_CHAT_MODEL;
    try {
      console.log(`[API] Validating model: ${selectedChatModel}`);
      const validModel = chatModels.some(model => model.id === selectedChatModel);
      modelToUse = validModel ? selectedChatModel : DEFAULT_CHAT_MODEL;
    } catch (validationError) {
      console.error(`[API] Error during model validation:`, validationError);
      modelToUse = DEFAULT_CHAT_MODEL;
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

    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          // Create conversation history format for the API
          const formattedMessages = messages.map(message => {
            if (message.role === 'user') {
              return { role: 'user', content: message.content };
            } else if (message.role === 'assistant') {
              return { role: 'assistant', content: message.content };
            } else if (message.role === 'system') {
              return { role: 'system', content: message.content };
            }
            return null;
          }).filter(Boolean);

          // Add system prompt
          const systemInstructions = systemPrompt({ selectedChatModel });
          if (systemInstructions) {
            formattedMessages.unshift({
              role: 'system',
              content: systemInstructions
            });
          }

          // Format the input for the API
          const input = { messages: formattedMessages };
          
          console.log(`[API] Starting stream with model: ${modelToUse}`);
          
          // Determine which model to use for the OpenAI Responses API
          const apiModel = modelToUse === 'gpt-o1' ? 'gpt-4o' : 
                          modelToUse === 'gpt-40' ? 'gpt-4o' : 
                          'gpt-4o-mini';
          
          // Setup tools based on agent type
          const tools = [];
          
          if (agentType === 'research') {
            tools.push({ type: 'web_search' });
          }
          
          try {
            // Use the streaming Responses API
            const stream = await openaiResponses.createStream(
              JSON.stringify(input), 
              { 
                model: apiModel, 
                tools: tools.length > 0 ? tools : undefined 
              }
            );
            
            // Accumulate the response for saving
            let fullResponse = '';
            
            // Process the streaming response
            for await (const chunk of stream) {
              if ('choices' in chunk && chunk.choices?.[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                fullResponse += content;
                
                // Stream the content to the client
                dataStream.writeData({
                  type: 'message',
                  message: {
                    id: generateUUID(),
                    role: 'assistant',
                    content: content,
                  }
                });
              }
              
              // Process tool usage if present
              if ('choices' in chunk && chunk.choices?.[0]?.delta?.tool_calls) {
                dataStream.writeData({
                  type: 'message',
                  message: {
                    id: generateUUID(),
                    role: 'system',
                    content: 'Using tools to process your request...',
                  }
                });
              }
            }
            
            // Save the complete response
            if (fullResponse) {
              await saveMessages({
                messages: [{
                  id: generateUUID(),
                  role: 'assistant',
                  content: fullResponse,
                  createdAt: new Date(),
                  chatId: id,
                }],
              });
              
              console.log(`[API] Saved response with length: ${fullResponse.length}`);
            } else {
              console.error('[API] No response content to save');
            }
            
          } catch (error) {
            logError(error, 'Error with stream');
            
            // Notify the client about the error
            dataStream.writeData({
              type: 'message',
              message: {
                id: generateUUID(),
                role: 'system',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              }
            });
            
            // Try again with fallback model
            try {
              console.log('[API] Attempting fallback with gpt-4o-mini');
              
              const fallbackStream = await openaiResponses.createStream(
                JSON.stringify(input), 
                { model: 'gpt-4o-mini' }
              );
              
              let fallbackResponse = '';
              
              for await (const chunk of fallbackStream) {
                if ('choices' in chunk && chunk.choices?.[0]?.delta?.content) {
                  const content = chunk.choices[0].delta.content;
                  fallbackResponse += content;
                  
                  dataStream.writeData({
                    type: 'message',
                    message: {
                      id: generateUUID(),
                      role: 'assistant',
                      content: content,
                    }
                  });
                }
              }
              
              // Save the fallback response
              if (fallbackResponse) {
                await saveMessages({
                  messages: [{
                    id: generateUUID(),
                    role: 'assistant',
                    content: fallbackResponse,
                    createdAt: new Date(),
                    chatId: id,
                  }],
                });
              }
              
            } catch (fallbackError) {
              logError(fallbackError, 'Fallback also failed');
              dataStream.writeData({
                type: 'message',
                message: {
                  id: generateUUID(),
                  role: 'system',
                  content: 'All models failed. Please try again later.',
                }
              });
            }
          }
          
        } catch (error) {
          logError(error, 'Unexpected error in stream handling');
          dataStream.writeData({
            type: 'message',
            message: {
              id: generateUUID(),
              role: 'system',
              content: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
          });
        }
      },
      onError: (error: unknown) => {
        logError(error, 'Chat API error in dataStream');
        return `Oops, an error occurred while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
      },
    });
  } catch (error) {
    logError(error, 'Unexpected error in chat API');
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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



