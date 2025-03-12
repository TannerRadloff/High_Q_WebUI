import { Agent, AgentResponse, AgentContext, StreamCallbacks } from './agent';
import OpenAI from 'openai';
import { generation_span } from './tracing';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the types of tasks our agents can handle
export enum TaskType {
  RESEARCH = 'research',
  REPORT = 'report',
  COMBINED = 'combined', // Both research and report
  UNKNOWN = 'unknown'
}

// Response interface for the triage agent
export interface TriageResult {
  taskType: TaskType;
  confidence: number; // 0-1 score of how confident the model is
  reasoning: string; // Explanation of why this task type was chosen
  modifiedQuery?: string; // Optionally modified/enhanced query
}

export class TriageAgent implements Agent {
  name = 'TriageAgent';

  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      if (!userQuery || userQuery.trim() === '') {
        return {
          success: false,
          content: '',
          error: 'Empty query provided. Please provide a valid query for triage.'
        };
      }

      // Get current timestamp for metadata
      const startTime = Date.now();

      // Create a generation span for tracing the OpenAI call
      const genSpan = generation_span("Triage Classification", {
        model: 'gpt-4o',
        input: userQuery
      });
      
      genSpan.enter();
      
      // Use OpenAI to triage the query
      const response = await client.responses.create({
        model: 'gpt-4o',
        instructions: `You are a task classification AI whose job is to analyze user queries and determine which specialized agent should handle them. Analyze the query and classify it into one of these task types:
        
        - RESEARCH: The query asks for information that requires web search to find current or specific factual information.
        - REPORT: The query is asking to analyze, summarize, or format existing information (no new research needed).
        - COMBINED: The query requires both research and report generation (this is common for complex queries).
        - UNKNOWN: The query doesn't clearly fit into any category above.

        Return a JSON object with the following fields:
        - taskType: The task type (one of "research", "report", "combined", or "unknown")
        - confidence: A number between 0 and 1 indicating your confidence in this classification
        - reasoning: A brief explanation of why you chose this task type
        - modifiedQuery: An optionally improved version of the query that would be clearer for the agent to process
        
        Respond ONLY with the JSON object, no other text.`,
        input: userQuery,
      });
      
      const outputText = response.output_text;
      
      // Update the span with the output
      genSpan.exit();

      // Parse the model's response as JSON
      try {
        // Extract the JSON content - the model might wrap it in code blocks or add extra text
        const jsonText = this.extractJsonFromText(outputText);
        const triageResult: TriageResult = JSON.parse(jsonText);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Build and return the agent response
        return {
          success: true,
          content: JSON.stringify(triageResult),
          metadata: {
            model: 'gpt-4o',
            responseTime,
            triageResult,
            originalQuery: userQuery,
            context
          }
        };
      } catch (parseError) {
        console.error('Failed to parse triage response:', parseError);
        // Fallback to combined task type if parsing fails
        return {
          success: true,
          content: JSON.stringify({
            taskType: TaskType.COMBINED,
            confidence: 0.5,
            reasoning: 'Fallback classification due to parsing error',
            modifiedQuery: userQuery
          }),
          metadata: {
            model: 'gpt-4o',
            parsingError: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
            originalQuery: userQuery,
            context
          }
        };
      }
    } catch (error) {
      console.error('TriageAgent error:', error);
      return {
        success: false,
        content: 'An error occurred while triaging the query.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Streams the triage process, though technically this doesn't stream from the OpenAI API
   * but rather processes the full response and then simulates streaming for a consistent interface
   */
  async streamTask(
    userQuery: string,
    callbacks: StreamCallbacks,
    context?: AgentContext
  ): Promise<void> {
    try {
      if (!userQuery || userQuery.trim() === '') {
        callbacks.onError?.(new Error('Empty query provided. Please provide a valid query for triage.'));
        return;
      }

      // Notify that streaming has started
      callbacks.onStart?.();

      // Get triage result (non-streaming, but we'll simulate streaming the response)
      const response = await this.handleTask(userQuery, context);

      if (!response.success) {
        callbacks.onError?.(new Error(response.error || 'Triage failed'));
        return;
      }

      try {
        // Parse the triage result
        const triageResult = JSON.parse(response.content) as TriageResult;
        
        // Stream individual parts of the result to simulate streaming
        callbacks.onToken?.(`Analyzing your query... \n\n`);
        
        // Pause briefly to simulate thinking/processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        callbacks.onToken?.(`This appears to be a ${triageResult.taskType.toUpperCase()} task.\n\n`);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        callbacks.onToken?.(`Confidence: ${(triageResult.confidence * 100).toFixed(1)}%\n\n`);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        callbacks.onToken?.(`Reasoning: ${triageResult.reasoning}\n\n`);
        
        if (triageResult.modifiedQuery && triageResult.modifiedQuery !== userQuery) {
          await new Promise(resolve => setTimeout(resolve, 300));
          callbacks.onToken?.(`I've adjusted your query to: "${triageResult.modifiedQuery}"\n\n`);
        }
        
        // Complete the streaming
        callbacks.onComplete?.(response);
      } catch (parseError) {
        console.error('Failed to parse triage result for streaming:', parseError);
        callbacks.onToken?.('Analysis complete, but encountered an error formatting the results.\n\n');
        callbacks.onComplete?.(response);
      }
    } catch (error) {
      console.error('TriageAgent streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Helper function to extract JSON from text which might contain markdown or extra content
   */
  private extractJsonFromText(text: string): string {
    // Try to find JSON content within code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1];
    }

    // Try to find content that looks like a JSON object
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return jsonObjectMatch[0];
    }

    // If we can't extract JSON, return the original text and let the JSON parser handle potential errors
    return text;
  }
} 