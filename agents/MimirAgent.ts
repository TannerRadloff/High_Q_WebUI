import { z } from 'zod';
import { AgentContext } from './agent';
import { BaseAgent } from './BaseAgent';
import { functionTool } from './tools';
import { ResearchAgent } from './ResearchAgent';
import { ReportAgent } from './ReportAgent';
import { JudgeAgent } from './JudgeAgent';
import { promptWithHandoffInstructions } from './handoff';

// Define the types of tasks our delegation agent can handle
export enum TaskDomain {
  RESEARCH = 'research',
  REPORT = 'report',
  CODING = 'coding',
  CREATIVE = 'creative',
  ANALYSIS = 'analysis',
  GENERAL_ASSISTANT = 'general_assistant',
  UNKNOWN = 'unknown'
}

// Response interface for the Mimir delegation agent
export interface DelegationResult {
  taskDomain: TaskDomain;
  confidence: number; // 0-1 score of how confident the model is
  reasoning: string; // Explanation of why this domain was chosen
  agentName: string; // Name of the agent that will handle this task
  modifiedQuery?: string; // Optionally modified/enhanced query
}

/**
 * Mimir - A delegation agent that determines which specialized agent should handle a user query
 * Uses OpenAI Agent SDK patterns and handoffs to delegate to appropriate specialized agents
 */
export class MimirAgent extends BaseAgent<DelegationResult> {
  constructor() {
    // Create the agents for handoffs
    const researchAgent = new ResearchAgent();
    const reportAgent = new ReportAgent();
    const judgeAgent = new JudgeAgent();
    // Add other specialized agents as needed

    super({
      name: 'MimirAgent',
      instructions: promptWithHandoffInstructions(`You are Mimir, a wise delegation agent that analyzes user requests and determines the most appropriate specialized agent to handle their needs.
      
      Your job is to:
      1. Analyze the user's request to fully understand what they need
      2. Determine which agent in your team is best suited to handle this request
      3. Inform the user which agent you're delegating to and why
      4. Hand off to the appropriate agent using the transfer functions
      
      Available agents and their specialties:
      
      - ResearchAgent:
        - Finding and synthesizing information
        - Answering factual questions
        - Data analysis and information verification
      
      - ReportAgent:
        - Creating structured reports and summaries
        - Formatting information in a clear, organized manner
        - Presenting data with tables and formatted text
      
      - JudgeAgent:
        - Evaluating options or making decisions
        - Providing balanced assessments
        - Weighing pros and cons
      
      Your tone should be helpful, informative, and transparent. Always explain to the user which agent you're delegating to and why that agent is best suited for their request.
      
      Important: You must use the classify_task tool for EVERY user query to properly document your delegation decision before making any handoffs.`),
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.2, // Lower temperature for more predictable delegation
      },
      outputType: {} as DelegationResult, // Type information for the output
      tools: [
        // Define a tool to capture the delegation decision
        functionTool(
          'classify_task',
          'Classify the user query into the appropriate task domain and select the best agent',
          z.object({
            taskDomain: z.enum([
              TaskDomain.RESEARCH,
              TaskDomain.REPORT,
              TaskDomain.CODING,
              TaskDomain.CREATIVE,
              TaskDomain.ANALYSIS,
              TaskDomain.GENERAL_ASSISTANT,
              TaskDomain.UNKNOWN
            ]).describe('The task domain classification'),
            confidence: z.number().min(0).max(1).describe('Confidence score (0-1)'),
            reasoning: z.string().describe('Explanation of why this domain and agent were chosen'),
            agentName: z.string().describe('Name of the agent selected to handle this task'),
            modifiedQuery: z.string().optional().describe('Optional improved version of the query')
          }),
          async (args) => {
            // This is a special tool that captures the delegation decision
            return JSON.stringify(args);
          }
        )
      ],
      // Add handoffs to allow the MimirAgent to delegate to other agents
      handoffs: [researchAgent, reportAgent, judgeAgent]
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
   * Override the handleTask method to extract the DelegationResult from the tool call
   * and trigger handoffs when appropriate
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<{
    success: boolean;
    content: string;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    try {
      // First, generate a user-facing message about the delegation process
      const delegationMessage = `I'm Mimir, your AI delegation assistant. I'll analyze your request and assign the most appropriate specialized agent from my team to help you. One moment please...`;
      
      // If we have streaming capability, we can send this message to the user
      if (context?.stream) {
        await context.stream({
          type: 'thinking',
          content: delegationMessage
        });
      }
      
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
            (call: any) => call.name === 'classify_task'
          );
          
          if (classifyCall) {
            const delegationResult = JSON.parse(classifyCall.arguments) as DelegationResult;
            
            // Return the delegation result
            return {
              success: true,
              content: JSON.stringify(delegationResult),
              metadata: {
                ...response.metadata,
                delegationResult
              }
            };
          }
        }
        
        // Otherwise try to extract from the text content
        const jsonText = this.extractJsonFromText(response.content);
        const delegationResult = JSON.parse(jsonText) as DelegationResult;
        
        return {
          success: true,
          content: JSON.stringify(delegationResult),
          metadata: {
            ...response.metadata,
            delegationResult
          }
        };
      } catch (parseError) {
        console.error('Failed to parse delegation response:', parseError);
        
        // Fallback to a default delegation
        const fallbackResult: DelegationResult = {
          taskDomain: TaskDomain.GENERAL_ASSISTANT,
          confidence: 0.5,
          reasoning: 'Failed to parse the model response. Defaulting to general assistant.',
          agentName: 'GeneralAssistant',
          modifiedQuery: userQuery
        };
        
        return {
          success: true,
          content: JSON.stringify(fallbackResult),
          metadata: {
            ...response.metadata,
            delegationResult: fallbackResult,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        };
      }
    } catch (error) {
      console.error('MimirAgent error:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 