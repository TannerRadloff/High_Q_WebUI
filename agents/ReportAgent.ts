import { Agent, AgentResponse, AgentContext, StreamCallbacks } from './agent';
import OpenAI from 'openai';
import { generation_span } from './tracing';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ReportAgent implements Agent {
  name = 'ReportAgent';

  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      if (!userQuery || userQuery.trim() === '') {
        return {
          success: false,
          content: '',
          error: 'Empty query provided. Please provide content for report generation.'
        };
      }

      const startTime = Date.now();
      
      // Create a generation span for the OpenAI call
      const genSpan = generation_span("Report Generation", {
        model: 'gpt-4o',
        input: userQuery
      });
      
      genSpan.enter();
      
      // Use OpenAI to generate the report
      const response = await client.responses.create({
        model: 'gpt-4o',
        instructions: `You are a professional report writer who creates clear, well-structured reports based on provided information.

        When generating a report:
        1. Organize information logically with headings and subheadings
        2. Include an executive summary if appropriate
        3. Maintain appropriate tone (formal, analytical)
        4. Preserve all citation references in the original format
        5. Format content for clarity and readability
        
        The report should be comprehensive but concise, focusing on key findings and insights.`,
        input: userQuery,
      });
      
      const outputText = response.output_text;
      
      genSpan.exit();

      // Record end time for performance tracking
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Return the agent response
      return {
        success: true,
        content: outputText,
        metadata: {
          model: 'gpt-4o',
          responseTime,
          query: userQuery,
          context
        }
      };
    } catch (error) {
      console.error('ReportAgent error:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stream the report generation process, returning tokens as they're generated
   */
  async streamTask(
    content: string,
    callbacks: StreamCallbacks,
    context?: AgentContext
  ): Promise<void> {
    try {
      // Validate input
      if (!content || content.trim() === '') {
        callbacks.onError?.(new Error('Empty content provided. Please provide valid content for report generation.'));
        return;
      }

      // Notify that streaming has started
      callbacks.onStart?.();

      const startTime = Date.now();
      let fullContent = '';

      // Use streaming mode of the Responses API
      const stream = await client.responses.create({
        model: 'gpt-4o',
        instructions: 'You are a professional report-writing assistant. Produce a structured, clear report in Markdown format, incorporating citations for all referenced information. Use proper headings, bullet points, and formatting to enhance readability.',
        input: content,
        stream: true,
      });

      try {
        // Process the stream
        for await (const chunk of stream) {
          // Extract content from the chunk based on its structure
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
          content: fullContent || 'Failed to generate report.',
          metadata: {
            model: 'gpt-4o',
            responseTime,
            contentLength: content.length,
            streaming: true,
            context
          }
        };

        callbacks.onComplete?.(finalResponse);
      } catch (streamError) {
        callbacks.onError?.(streamError instanceof Error ? streamError : new Error('Stream processing error'));
      }
    } catch (error) {
      console.error('ReportAgent streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Helper method to extract content from a stream chunk, regardless of its structure
   */
  private extractContentFromStreamChunk(chunk: any): string | null {
    try {
      // Handle different chunk types based on OpenAI's streaming format
      if (chunk.type && chunk.type.includes('delta')) {
        // Handle delta chunks (incremental content)
        return chunk.delta?.value || '';
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