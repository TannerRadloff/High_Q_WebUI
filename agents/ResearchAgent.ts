import { Agent, AgentResponse, AgentContext, StreamCallbacks } from './agent';
import OpenAI from 'openai';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ResearchAgent implements Agent {
  name = 'ResearchAgent';

  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      if (!userQuery || userQuery.trim() === '') {
        return {
          success: false,
          content: '',
          error: 'Empty query provided. Please provide a valid research query.'
        };
      }

      // Get current timestamp for metadata
      const startTime = Date.now();

      // Use the OpenAI Response API with web_search tool enabled
      const response = await client.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        instructions: 'You are an AI research assistant. Search the web for current and relevant information and return a summary with citations. Include the source URLs for all information.',
        input: userQuery,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Build and return the agent response
      return {
        success: true,
        content: response.output_text || 'No research data found.',
        metadata: {
          model: 'gpt-4o',
          responseTime,
          toolsUsed: 'web_search_preview',
          query: userQuery,
          context
        }
      };
    } catch (error) {
      console.error('ResearchAgent error:', error);
      return {
        success: false,
        content: 'An error occurred while conducting research.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stream the research process, returning tokens as they're generated
   */
  async streamTask(
    userQuery: string,
    callbacks: StreamCallbacks,
    context?: AgentContext
  ): Promise<void> {
    try {
      // Validate input
      if (!userQuery || userQuery.trim() === '') {
        callbacks.onError?.(new Error('Empty query provided. Please provide a valid research query.'));
        return;
      }

      // Notify that streaming has started
      callbacks.onStart?.();

      const startTime = Date.now();
      let fullContent = '';

      // Use streaming mode of the Responses API
      const stream = await client.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        instructions: 'You are an AI research assistant. Search the web for current and relevant information and return a summary with citations. Include the source URLs for all information.',
        input: userQuery,
        stream: true,
      });

      try {
        // Process the stream
        for await (const chunk of stream) {
          // Extract content from the chunk based on its structure
          // This approach avoids relying on specific property names that might change
          const chunkContent = this.extractContentFromStreamChunk(chunk);
          
          if (chunkContent) {
            fullContent += chunkContent;
            callbacks.onToken?.(chunkContent);
          }
        }

        // Streaming complete, call onComplete with the full response
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const finalResponse: AgentResponse = {
          success: true,
          content: fullContent || 'No research data found.',
          metadata: {
            model: 'gpt-4o',
            responseTime,
            toolsUsed: 'web_search_preview',
            streaming: true,
            query: userQuery,
            context
          }
        };

        callbacks.onComplete?.(finalResponse);
      } catch (streamError) {
        callbacks.onError?.(streamError instanceof Error ? streamError : new Error('Stream processing error'));
      }
    } catch (error) {
      console.error('ResearchAgent streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Helper method to extract content from a stream chunk, regardless of its structure
   */
  private extractContentFromStreamChunk(chunk: any): string | null {
    try {
      // Handle different chunk types based on OpenAI's streaming format
      // If structure changes, only this method needs to be updated
      if (chunk.type && chunk.type.includes('delta')) {
        // Handle delta chunks (incremental content)
        return chunk.delta?.value || '';
      } else if (chunk.type && chunk.type.includes('searching')) {
        // Handle searching status
        return '[Searching the web...]';
      } else if (chunk.output_text) {
        // Handle complete output chunks
        return chunk.output_text;
      } else if (typeof chunk === 'string') {
        // Handle simple string chunks
        return chunk;
      }
      
      // No recognizable content
      return null;
    } catch (e) {
      // If we can't parse the chunk, just return null
      return null;
    }
  }
} 