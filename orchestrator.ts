// orchestrator.ts
import { ResearchAgent } from './agents/ResearchAgent';
import { ReportAgent } from './agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from './agents/TriageAgent';
import { AgentResponse, StreamCallbacks, AgentContext } from './agents/agent';
import { trace, configureTracing, RunConfig } from './agents/tracing';
import { BaseAgent } from './agents/BaseAgent';
import { functionTool } from './agents/tools';
import { z } from 'zod';

export interface OrchestrationResult {
  success: boolean;
  report: string;
  error?: string;
  metadata?: {
    taskType?: TaskType;
    handoffPath?: string[];
    executionTimeMs: number;
    [key: string]: any;
  }
}

export interface StreamOrchestrationCallbacks extends StreamCallbacks {
  onTriageComplete?: (result: TriageResult) => void;
  onResearchStart?: () => void;
  onResearchComplete?: (researchData: string) => void;
  onReportStart?: () => void;
  onHandoff?: (from: string, to: string) => void;
}

/**
 * DelegationAgent is the main model that users first interact with.
 * It analyzes the query and delegates to specialized agents.
 */
export class DelegationAgent extends BaseAgent {
  constructor() {
    // Create the specialized agents
    const triageAgent = new TriageAgent();
    const researchAgent = new ResearchAgent();
    const reportAgent = new ReportAgent();

    super({
      name: 'DelegationAgent',
      // Using dynamic instructions that can adapt based on context
      instructions: (context: AgentContext) => {
        // Get user information from context if available
        const userName = context.userName || 'user';
        const userPreferences = context.userPreferences || {};
        const userHistory = context.userHistory || [];
        
        // Base instructions
        let dynamicInstructions = `You are an intelligent assistant named Mimir that helps ${userName} by delegating tasks to specialized agents.
        
        Your job is to:
        1. Understand the user's request 
        2. Determine which specialized agent can best handle this request
        3. Delegate the task to the appropriate agent using the available handoff tools
        4. You should NOT attempt to answer the user's question directly - your job is to delegate
        
        Available specialized agents:
        - TriageAgent: For analyzing and categorizing tasks, determining the right workflow
        - ResearchAgent: For finding current information and answering factual questions
        - ReportAgent: For formatting information and creating structured reports`;
        
        // Add user preferences if available
        if (Object.keys(userPreferences).length > 0) {
          dynamicInstructions += `\n\nUser preferences to consider:`;
          
          if (userPreferences.responseStyle) {
            dynamicInstructions += `\n- Prefers ${userPreferences.responseStyle} style responses`;
          }
          
          if (userPreferences.detailLevel) {
            dynamicInstructions += `\n- Prefers ${userPreferences.detailLevel} level of detail`;
          }
          
          // Other preferences can be added similarly
        }
        
        // Add context about recent interactions if available
        if (userHistory.length > 0) {
          dynamicInstructions += `\n\nRecent interactions context: The user has been discussing ${userHistory.join(', ')}`;
        }
        
        dynamicInstructions += `\n\nAlways delegate to the most appropriate agent. If unsure, delegate to the TriageAgent which can further analyze the request.`;
        
        return dynamicInstructions;
      },
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.3, // Lower temperature for more predictable delegation
      },
      // Add handoffs to specialized agents
      handoffs: [triageAgent, researchAgent, reportAgent],
      // Add a fallback tool to handle delegation failures
      tools: [
        functionTool(
          'analyze_request',
          'Analyze the user request to determine appropriate delegation',
          z.object({
            request: z.string().describe('The user request to analyze'),
            recommendation: z.string().describe('The recommended agent to handle this'),
            reason: z.string().describe('Why this agent is the best choice')
          }),
          async (args) => {
            // Just return the analysis results
            return JSON.stringify(args);
          }
        )
      ]
    });
  }
}

/**
 * Orchestrator class that manages the workflow between agents
 * Similar to the Runner class in the OpenAI Agent SDK
 * Uses agent handoffs to allow agents to decide how to delegate work
 */
export class Orchestrator {
  private delegationAgent: DelegationAgent;
  private triageAgent: TriageAgent;
  private researchAgent: ResearchAgent;

  constructor() {
    // We now use DelegationAgent as the primary entry point
    this.delegationAgent = new DelegationAgent();
    // We still keep direct agent references for utility methods
    this.triageAgent = new TriageAgent();
    this.researchAgent = new ResearchAgent();
  }

  /**
   * Counts citations in the provided text by delegating to the ResearchAgent
   */
  countCitations(text: string): number {
    return this.researchAgent.countCitations(text);
  }

  /**
   * Handles a user query using agent handoffs
   * The DelegationAgent will determine which agents should handle the query
   * and initiate the appropriate handoffs
   */
  async handleQuery(userQuery: string, config?: RunConfig): Promise<OrchestrationResult> {
    // Configure tracing based on provided config
    configureTracing(config);
    
    // Create a trace for this query
    const queryTrace = trace(config?.workflow_name || "Agent query", config);
    const traceInstance = queryTrace.start();
    
    const startTime = Date.now();
    const handoffPath: string[] = ['DelegationAgent']; // Track the path of handoffs
    
    try {
      // 1. Validate input
      if (!userQuery || userQuery.trim() === '') {
        const result = {
          success: false,
          report: '',
          error: 'Empty query provided. Please provide a valid research query.',
          metadata: {
            handoffPath,
            executionTimeMs: Date.now() - startTime
          }
        };
        
        await queryTrace.finish();
        return result;
      }
      
      // 2. Send the query to the DelegationAgent which will handle handoffs
      const response = await this.delegationAgent.handleTask(userQuery, {
        handoffTracker: handoffPath // Pass handoff path to track the flow
      });
      
      // 3. Process the response
      if (response.success) {
        // The final response may have come from any agent in the handoff chain
        const result: OrchestrationResult = {
          success: true,
          report: response.content,
          metadata: {
            handoffPath: response.metadata?.handoffTracker || handoffPath,
            executionTimeMs: Date.now() - startTime,
            ...response.metadata
          }
        };
        
        await queryTrace.finish();
        return result;
      } else {
        const result: OrchestrationResult = {
          success: false,
          report: '',
          error: response.error || 'Unknown error occurred during processing',
          metadata: {
            handoffPath: response.metadata?.handoffTracker || handoffPath,
            executionTimeMs: Date.now() - startTime
          }
        };
        
        await queryTrace.finish();
        return result;
      }
    } catch (error) {
      console.error('Orchestration error:', error);
      
      const result: OrchestrationResult = {
        success: false,
        report: '',
        error: error instanceof Error ? error.message : 'Unknown error during orchestration',
        metadata: {
          handoffPath,
          executionTimeMs: Date.now() - startTime
        }
      };
      
      await queryTrace.finish();
      return result;
    }
  }

  /**
   * Stream the orchestration process, providing updates at each step
   * Uses agent handoffs with streaming where available
   */
  async streamQuery(
    userQuery: string, 
    callbacks: StreamOrchestrationCallbacks,
    config?: RunConfig
  ): Promise<void> {
    // Configure tracing based on provided config
    configureTracing(config);
    
    // Create a trace for this query
    const queryTrace = trace(config?.workflow_name || "Agent query (streaming)", config);
    const traceInstance = queryTrace.start();
    
    const handoffPath: string[] = ['DelegationAgent']; // Track the path of handoffs
    
    try {
      // Notify that streaming has started
      callbacks.onStart?.();
      
      // 1. Validate input
      if (!userQuery || userQuery.trim() === '') {
        callbacks.onError?.(new Error('Empty query provided. Please provide a valid research query.'));
        await queryTrace.finish();
        return;
      }
      
      callbacks.onToken?.('Analyzing your query...\n\n');
      
      // 2. Create handoff-aware wrapper callbacks
      const wrappedCallbacks: StreamCallbacks = {
        onStart: callbacks.onStart,
        onToken: callbacks.onToken,
        onError: callbacks.onError,
        onComplete: callbacks.onComplete,
        // Track handoffs in the streaming process
        onHandoff: (sourceAgentName: string, targetAgentName: string) => {
          handoffPath.push(targetAgentName);
          callbacks.onToken?.(`\n\nHanding off from ${sourceAgentName} to ${targetAgentName}...\n\n`);
          
          // Call appropriate callbacks based on agent type
          if (targetAgentName.toLowerCase().includes('research')) {
            callbacks.onResearchStart?.();
          } else if (targetAgentName.toLowerCase().includes('report')) {
            callbacks.onReportStart?.();
          } else if (targetAgentName.toLowerCase().includes('triage')) {
            callbacks.onTriageComplete?.({ 
              taskType: TaskType.UNKNOWN, 
              confidence: 1.0,
              reasoning: 'Delegated to TriageAgent for analysis'
            });
          }
          
          // Call generic handoff callback if provided
          callbacks.onHandoff?.(sourceAgentName, targetAgentName);
        }
      };
      
      // 3. Stream with the DelegationAgent, which will handle handoffs to other agents
      await this.delegationAgent.streamTask(userQuery, wrappedCallbacks, {
        handoffTracker: handoffPath
      });
      
      await queryTrace.finish();
    } catch (error) {
      console.error('Streaming orchestration error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error during streaming orchestration'));
      await queryTrace.finish();
    }
  }
} 