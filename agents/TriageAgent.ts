import { z } from 'zod';
import { AgentContext } from './agent';
import { BaseAgent } from './BaseAgent';
import { functionTool } from './tools';
import { ResearchAgent } from './ResearchAgent';
import { ReportAgent } from './ReportAgent';

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

/**
 * A specialized agent that determines which agent should handle a user query
 * Follows OpenAI Agent SDK patterns and uses handoffs to delegate to appropriate agents
 */
export class TriageAgent extends BaseAgent<TriageResult> {
  constructor() {
    // Create the agents for handoffs
    const researchAgent = new ResearchAgent();
    const reportAgent = new ReportAgent();

    super({
      name: 'TriageAgent',
      instructions: `You are a task classification AI whose job is to analyze user queries and determine which specialized agent should handle them. Analyze the query and classify it into one of these task types:
        
      - RESEARCH: The query asks for information that requires web search to find current or specific factual information. Hand off to ResearchAgent.
      - REPORT: The query is asking to analyze, summarize, or format existing information (no new research needed). Hand off to ReportAgent.
      - COMBINED: The query requires both research and report generation (this is common for complex queries). Hand off to ResearchAgent first, then the results will be passed to ReportAgent.
      - UNKNOWN: The query doesn't clearly fit into any category above. Try to handle it as best you can or suggest a better query.
      
      When you analyze a query, you should:
      1. Determine the task type 
      2. Hand off to the appropriate agent using the transfer_to_researchagent or transfer_to_reportagent functions
      3. For COMBINED tasks, always hand off to the ResearchAgent first
      
      You should hand off as soon as you've classified the query - do not try to answer it yourself.`,
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.3, // Lower temperature for more predictable outputs
      },
      outputType: {} as TriageResult, // Type information for the output
      tools: [
        // Define a tool to capture the triage classification result
        functionTool(
          'classify_query',
          'Classify the user query into the appropriate task type',
          z.object({
            taskType: z.enum([
              TaskType.RESEARCH,
              TaskType.REPORT,
              TaskType.COMBINED,
              TaskType.UNKNOWN
            ]).describe('The task type classification'),
            confidence: z.number().min(0).max(1).describe('Confidence score (0-1)'),
            reasoning: z.string().describe('Explanation of why this task type was chosen'),
            modifiedQuery: z.string().optional().describe('Optional improved version of the query')
          }),
          async (args) => {
            // This is a special tool that captures the classification result
            // The output isn't used directly since we extract it from the tool call
            return JSON.stringify(args);
          }
        )
      ],
      // Add handoffs to allow the TriageAgent to delegate to other agents
      handoffs: [researchAgent, reportAgent]
    });
  }

  /**
   * Extract JSON from text, handling cases where the model might wrap it in code blocks
   */
  private extractJsonFromText(text: string): string {
    // Try to find JSON in code blocks
    const codeBlockMatch = text.match(/```(?:json)?([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }
    
    // Try to find JSON with curly braces
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // Return the original text if no JSON pattern was found
    return text;
  }

  /**
   * Override the handleTask method to extract the TriageResult from the tool call
   * and trigger handoffs when appropriate
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<{
    success: boolean;
    content: string;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    try {
      // Handle the task with the base implementation
      // This will automatically handle any handoffs that occur
      const response = await super.handleTask(userQuery, context);
      
      // If a handoff occurred, the response will contain the result from the target agent
      // so we can just return it directly
      if (response.metadata?.handoffOccurred) {
        return response;
      }
      
      // If no handoff occurred, we need to parse the response manually
      if (!response.success) {
        return response;
      }
      
      // Try to extract the JSON from the response
      try {
        // First check if there's a tool call in the metadata
        if (response.metadata?.toolCalls) {
          const classifyCall = response.metadata.toolCalls.find(
            (call: any) => call.name === 'classify_query'
          );
          
          if (classifyCall) {
            const triageResult = JSON.parse(classifyCall.arguments) as TriageResult;
            
            // Log the classification but don't hand off here since that would be handled
            // by the BaseAgent's tool call handling
            return {
              success: true,
              content: JSON.stringify(triageResult),
              metadata: {
                ...response.metadata,
                triageResult
              }
            };
          }
        }
        
        // Otherwise try to extract from the text content
        const jsonText = this.extractJsonFromText(response.content);
        const triageResult = JSON.parse(jsonText) as TriageResult;
        
        return {
          success: true,
          content: JSON.stringify(triageResult),
          metadata: {
            ...response.metadata,
            triageResult
          }
        };
      } catch (parseError) {
        console.error('Failed to parse triage response:', parseError);
        
        // Fallback to a default classification
        const fallbackResult: TriageResult = {
          taskType: TaskType.COMBINED,
          confidence: 0.5,
          reasoning: 'Failed to parse the model response. Defaulting to combined task type.',
          modifiedQuery: userQuery
        };
        
        return {
          success: true,
          content: JSON.stringify(fallbackResult),
          metadata: {
            ...response.metadata,
            triageResult: fallbackResult,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        };
      }
    } catch (error) {
      console.error('TriageAgent error:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 