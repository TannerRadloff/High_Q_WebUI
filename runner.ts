// runner.ts (replacing orchestrator.ts)
import { ResearchAgent } from './agents/ResearchAgent';
import { ReportAgent } from './agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from './agents/TriageAgent';
import { AgentResponse, StreamCallbacks, AgentContext } from './agents/agent';
import { trace, configureTracing, RunConfig } from './agents/tracing';
import { BaseAgent } from './agents/BaseAgent';
import { functionTool } from './agents/tools';
import { z } from 'zod';

export interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: {
    taskType?: TaskType;
    handoffPath?: string[];
    executionTimeMs: number;
    [key: string]: any;
  }
}

export interface StreamRunCallbacks extends StreamCallbacks {
  onTriageComplete?: (result: TriageResult) => void;
  onResearchStart?: () => void;
  onResearchComplete?: (researchData: string) => void;
  onReportStart?: () => void;
  onHandoff?: (from: string, to: string) => void;
}

/**
 * Runner class that manages agent execution
 * Follows OpenAI Agent SDK patterns for consistency
 */
export class AgentRunner {
  private agent: BaseAgent;
  private traceEnabled: boolean;
  
  /**
   * Create a new Runner with the specified agent
   * @param agent The agent to run (defaults to DelegationAgent)
   * @param options Configuration options
   */
  constructor(agent?: BaseAgent, options: { traceEnabled?: boolean } = {}) {
    // If no agent is provided, create a DelegationAgent
    if (!agent) {
      // Create the specialized agents for handoffs
      const triageAgent = new TriageAgent();
      const researchAgent = new ResearchAgent();
      const reportAgent = new ReportAgent();
      
      // Create a delegation agent with handoffs to specialized agents
      this.agent = new BaseAgent({
        name: 'DelegationAgent',
        instructions: `You are an intelligent assistant that helps users by delegating tasks to specialized agents.
        
        Your job is to:
        1. Understand the user's request 
        2. Determine which specialized agent can best handle this request
        3. Delegate the task to the appropriate agent using the available handoff tools
        
        Available specialized agents:
        - TriageAgent: For analyzing and categorizing tasks, determining the right workflow
        - ResearchAgent: For finding current information and answering factual questions
        - ReportAgent: For formatting information and creating structured reports
        
        Always delegate to the most appropriate agent. If unsure, delegate to the TriageAgent which can further analyze the request.`,
        model: 'gpt-4o',
        modelSettings: {
          temperature: 0.3,
        },
        handoffs: [triageAgent, researchAgent, reportAgent],
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
              return JSON.stringify(args);
            }
          )
        ]
      });
    } else {
      this.agent = agent;
    }
    
    this.traceEnabled = options.traceEnabled ?? true;
  }
  
  /**
   * Run the agent on a user query
   * @param query The user's query
   * @param config Configuration for this run
   * @returns The result of running the agent
   */
  async run(query: string, config?: RunConfig): Promise<RunResult> {
    if (this.traceEnabled) {
      configureTracing(config);
    }
    
    // Create a trace for this run
    const runTrace = trace(config?.workflow_name || `${this.agent.name} run`, config);
    const traceInstance = runTrace.start();
    
    const startTime = Date.now();
    const handoffPath: string[] = [this.agent.name]; // Track path of handoffs
    
    try {
      // Validate input
      if (!query || query.trim() === '') {
        const result = {
          success: false,
          output: '',
          error: 'Empty query provided. Please provide a valid query.',
          metadata: {
            handoffPath,
            executionTimeMs: Date.now() - startTime
          }
        };
        
        await runTrace.finish();
        return result;
      }
      
      // Run the agent with the query
      const response = await this.agent.handleTask(query, {
        handoffTracker: handoffPath
      });
      
      // Process the response
      if (response.success) {
        const result: RunResult = {
          success: true,
          output: response.content,
          metadata: {
            handoffPath: response.metadata?.handoffTracker || handoffPath,
            executionTimeMs: Date.now() - startTime,
            ...response.metadata
          }
        };
        
        await runTrace.finish();
        return result;
      } else {
        const result: RunResult = {
          success: false,
          output: '',
          error: response.error || 'Unknown error occurred during processing',
          metadata: {
            handoffPath: response.metadata?.handoffTracker || handoffPath,
            executionTimeMs: Date.now() - startTime
          }
        };
        
        await runTrace.finish();
        return result;
      }
    } catch (error) {
      console.error('Run error:', error);
      
      const result: RunResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error during run',
        metadata: {
          handoffPath,
          executionTimeMs: Date.now() - startTime
        }
      };
      
      await runTrace.finish();
      return result;
    }
  }

  /**
   * Stream the agent's execution process, providing updates at each step
   */
  async streamRun(
    query: string, 
    callbacks: StreamRunCallbacks,
    config?: RunConfig
  ): Promise<void> {
    if (this.traceEnabled) {
      configureTracing(config);
    }
    
    // Create a trace for this run
    const runTrace = trace(config?.workflow_name || `${this.agent.name} run (streaming)`, config);
    const traceInstance = runTrace.start();
    
    const handoffPath: string[] = [this.agent.name]; // Track path of handoffs
    
    try {
      // Notify that streaming has started
      callbacks.onStart?.();
      
      // Validate input
      if (!query || query.trim() === '') {
        callbacks.onError?.(new Error('Empty query provided. Please provide a valid query.'));
        await runTrace.finish();
        return;
      }
      
      callbacks.onToken?.('Analyzing your query...\n\n');
      
      // Create handoff-aware wrapper callbacks
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
      
      // Stream the agent execution
      await this.agent.streamTask(query, wrappedCallbacks, {
        handoffTracker: handoffPath
      });
      
      await runTrace.finish();
    } catch (error) {
      console.error('Streaming run error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error during streaming run'));
      await runTrace.finish();
    }
  }
  
  /**
   * Get the current agent
   */
  getAgent(): BaseAgent {
    return this.agent;
  }
  
  /**
   * Set a new agent for this runner
   */
  setAgent(agent: BaseAgent): void {
    this.agent = agent;
  }
  
  /**
   * Set whether tracing is enabled
   */
  setTraceEnabled(enabled: boolean): void {
    this.traceEnabled = enabled;
  }
}

// Export the DelegationAgent for backwards compatibility or direct use
export { TriageAgent, ResearchAgent, ReportAgent, TaskType }; 