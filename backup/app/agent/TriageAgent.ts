import { z } from 'zod';
import { AgentContext } from './agent';
import { BaseAgent } from './BaseAgent';
import { functionTool } from './tools';
import { ResearchAgent } from './ResearchAgent';
import { ReportAgent } from './ReportAgent';
import { RECOMMENDED_PROMPT_PREFIX, promptWithHandoffInstructions } from './handoff';

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
      instructions: promptWithHandoffInstructions(`You are a Triage Agent that helps analyze user requests and determine the best next steps.
      
      Your job is to:
      1. Analyze the user's request to understand what they need
      2. Hand off to the appropriate agent using the transfer_to_researchagent or transfer_to_reportagent functions
      
      When to use ResearchAgent:
      - When the user needs information or answers to factual questions
      - When data analysis or information synthesis is required
      - When the request involves finding or validating information
      
      When to use ReportAgent:
      - When the user wants information formatted in a structured way
      - When the final output should be a report, summary, or formatted document
      - When tables, charts, or structured data presentation would be helpful
      
      If you're not sure, use your best judgment based on the user's request.`),
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