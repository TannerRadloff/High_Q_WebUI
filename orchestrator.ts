// orchestrator.ts
import { ResearchAgent } from './agents/ResearchAgent';
import { ReportAgent } from './agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from './agents/TriageAgent';
import { AgentResponse, StreamCallbacks } from './agents/agent';
import { trace, configureTracing, RunConfig } from './agents/tracing';

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
 * Orchestrator class that manages the workflow between agents
 * Similar to the Runner class in the OpenAI Agent SDK
 * Uses agent handoffs to allow agents to decide how to delegate work
 */
export class Orchestrator {
  private triageAgent: TriageAgent;
  private researchAgent: ResearchAgent;

  constructor() {
    // We need TriageAgent for the main entry point
    this.triageAgent = new TriageAgent();
    // We create ResearchAgent directly for access to its methods like countCitations
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
   * The TriageAgent will determine which agents should handle the query
   * and initiate the appropriate handoffs
   */
  async handleQuery(userQuery: string, config?: RunConfig): Promise<OrchestrationResult> {
    // Configure tracing based on provided config
    configureTracing(config);
    
    // Create a trace for this query
    const queryTrace = trace(config?.workflow_name || "Agent query", config);
    const traceInstance = queryTrace.start();
    
    const startTime = Date.now();
    const handoffPath: string[] = ['TriageAgent']; // Track the path of handoffs
    
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
      
      // 2. Send the query to the TriageAgent which will handle handoffs
      const response = await this.triageAgent.handleTask(userQuery, {
        handoffTracker: handoffPath // Pass handoff path to track the flow
      });
      
      // 3. Process the response
      if (response.success) {
        // The final response may have come from any agent in the handoff chain
        const result: OrchestrationResult = {
          success: true,
          report: response.content,
          metadata: {
            handoffPath: response.metadata?.handoffPath || handoffPath,
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
            handoffPath: response.metadata?.handoffPath || handoffPath,
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
    
    const handoffPath: string[] = ['TriageAgent']; // Track the path of handoffs
    
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
          }
          
          // Call generic handoff callback if provided
          callbacks.onHandoff?.(sourceAgentName, targetAgentName);
        }
      };
      
      // 3. Stream with the TriageAgent, which will handle handoffs to other agents
      await this.triageAgent.streamTask(userQuery, wrappedCallbacks, {
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