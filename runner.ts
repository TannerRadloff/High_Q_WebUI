// Define clear return type to help identify issues
import { RunConfig } from './agents/tracing';

// runner.ts (replacing orchestrator.ts)
import { ResearchAgent } from './agents/ResearchAgent';
import { ReportAgent } from './agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from './agents/TriageAgent';
import { AgentResponse, StreamCallbacks, AgentContext, HandoffInputFilter } from './agents/agent';
import { trace, configureTracing } from './agents/tracing';
import { BaseAgent } from './agents/BaseAgent';
import { functionTool } from './agents/tools';
import { z } from 'zod';
import { handoff, handoffFilters, promptWithHandoffInstructions, RECOMMENDED_PROMPT_PREFIX } from './agents/handoff';

/**
 * Event types for streaming - aligns with OpenAI Agent SDK events
 */
export enum AgentRunEventType {
  START = 'agent_run_start',
  END = 'agent_run_end',
  TOKEN = 'token',
  AGENT_START = 'agent_start',
  AGENT_END = 'agent_end',
  HANDOFF = 'handoff',
  TOOL_START = 'tool_start',
  TOOL_END = 'tool_end',
  ERROR = 'error'
}

export type AgentRunEvent = {
  type: AgentRunEventType | string;
  timestamp: string;
  [key: string]: any;
};

/**
 * Run item types to track generated items during an agent run
 */
export enum RunItemType {
  MESSAGE = 'message',
  HANDOFF_CALL = 'handoff_call',
  HANDOFF_OUTPUT = 'handoff_output',
  TOOL_CALL = 'tool_call',
  TOOL_CALL_OUTPUT = 'tool_call_output',
  REASONING = 'reasoning'
}

/**
 * Base class for run items generated during agent execution
 */
export interface RunItem {
  type: RunItemType;
  timestamp: string;
  raw_item: any;
}

/**
 * Message output from an LLM
 */
export interface MessageOutputItem extends RunItem {
  type: RunItemType.MESSAGE;
  raw_item: { role: string; content: string };
}

/**
 * Handoff call from an LLM
 */
export interface HandoffCallItem extends RunItem {
  type: RunItemType.HANDOFF_CALL;
  raw_item: any; // Tool call item from LLM
}

/**
 * Output from a handoff operation
 */
export interface HandoffOutputItem extends RunItem {
  type: RunItemType.HANDOFF_OUTPUT;
  raw_item: any; // Tool response
  source_agent: BaseAgent;
  target_agent: BaseAgent;
}

/**
 * Tool call from an LLM
 */
export interface ToolCallItem extends RunItem {
  type: RunItemType.TOOL_CALL;
  raw_item: any; // Tool call item from LLM
}

/**
 * Output from a tool call
 */
export interface ToolCallOutputItem extends RunItem {
  type: RunItemType.TOOL_CALL_OUTPUT;
  raw_item: any; // Tool response
  tool_output: any;
}

/**
 * Reasoning from an LLM
 */
export interface ReasoningItem extends RunItem {
  type: RunItemType.REASONING;
  raw_item: string; // Reasoning content
}

/**
 * Base result interface for agent runs, aligned with OpenAI Agent SDK
 */
export interface RunResultBase {
  success: boolean;
  output: string;
  final_output: any; // Can be string or agent-specific output type
  error?: string;
  metadata?: {
    taskType?: TaskType;
    handoffPath?: string[];
    executionTimeMs: number;
    [key: string]: any;
  };
  last_agent: BaseAgent; // Reference to the last agent that ran
  new_items: RunItem[]; // Items generated during the run
  input_guardrail_results?: any[]; // Results of input guardrails
  output_guardrail_results?: any[]; // Results of output guardrails
  raw_responses: any[]; // Raw LLM responses
  
  /**
   * Convert the result to an input list for a follow-up conversation turn
   */
  to_input_list: () => any[];
}

/**
 * Result returned from running an agent, aligned with OpenAI Agent SDK
 */
export interface RunResult extends RunResultBase {
  // Non-streaming specific properties can be added here
}

/**
 * Result for streamed agent runs, aligned with OpenAI Agent SDK
 */
export interface RunResultStreaming extends RunResultBase {
  /**
   * Returns an async generator that yields events from the agent run
   * Aligns exactly with OpenAI Agent SDK stream_events pattern
   */
  stream_events: () => AsyncGenerator<AgentRunEvent, void, unknown>;
}

export interface StreamRunCallbacks extends StreamCallbacks {
  onTriageComplete?: (result: TriageResult) => void;
  onResearchStart?: () => void;
  onResearchComplete?: (researchData: string) => void;
  onReportStart?: () => void;
  onHandoff?: (from: string, to: string) => void;
}

/**
 * Custom errors aligned with OpenAI Agent SDK
 */
export class AgentsException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentsException';
  }
}

export class MaxTurnsExceededError extends AgentsException {
  constructor(message: string = 'Maximum number of turns exceeded') {
    super(message);
    this.name = 'MaxTurnsExceededError';
  }
}

export class ModelBehaviorError extends AgentsException {
  constructor(message: string) {
    super(message);
    this.name = 'ModelBehaviorError';
  }
}

export class UserError extends AgentsException {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
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
      
      // Example of a handoff callback
      const onHandoff = (ctx: AgentContext) => {
        console.log(`Handoff detected to agent: ${ctx.handoffTracker?.at(-1)}`);
      };
      
      // Example of input type for a handoff using regular Zod schema
      const ResearchRequestSchema = z.object({
        topic: z.string().describe('Research topic to investigate'),
        depth: z.enum(['basic', 'detailed', 'comprehensive']).describe('Depth of research required')
      });
      
      // Create a delegation agent with handoffs to specialized agents
      this.agent = new BaseAgent({
        name: 'DelegationAgent',
        instructions: promptWithHandoffInstructions(`You are an intelligent assistant that helps users by delegating tasks to specialized agents.
        
        Your job is to:
        1. Understand the user's request 
        2. Determine which specialized agent can best handle this request
        3. Delegate the task to the appropriate agent using the available handoff tools
        
        Available specialized agents:
        - TriageAgent: For analyzing and categorizing tasks, determining the right workflow
        - ResearchAgent: For finding current information and answering factual questions
        - ReportAgent: For formatting information and creating structured reports
        
        Always delegate to the most appropriate agent. If unsure, delegate to the TriageAgent which can further analyze the request.`),
        model: 'gpt-4o',
        modelSettings: {
          temperature: 0.3,
        },
        handoffs: [
          triageAgent, 
          handoff(researchAgent, {
            onHandoff: onHandoff,
            inputType: ResearchRequestSchema
          }),
          handoff(reportAgent, {
            toolNameOverride: 'format_as_report',
            toolDescriptionOverride: 'Format the information as a structured report'
          })
        ],
        handoffInputFilter: handoffFilters.removeAllTools,
        tools: [
          functionTool(
            'analyze_request',
            'Analyze the user request to determine appropriate delegation',
            z.object({
              request: z.string().describe('The user request to analyze'),
              category: z.string().describe('The category of the request')
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
   * @param query The user's query or input items
   * @param config Configuration for this run
   * @param max_turns Maximum number of turns before raising MaxTurnsExceededError
   * @returns The result of running the agent
   */
  async run(query: string | any[], config?: RunConfig, max_turns: number = 25): Promise<RunResult> {
    if (this.traceEnabled) {
      configureTracing(config);
    }
    
    // Create a trace for this run
    const runTrace = trace(config?.workflow_name || `${this.agent.name} run`, config);
    const traceInstance = runTrace.start();
    
    const startTime = Date.now();
    const handoffPath: string[] = [this.agent.name]; // Track path of handoffs
    let inputGuardrailResults: any[] = [];
    let outputGuardrailResults: any[] = [];
    let rawResponses: any[] = [];
    let newItems: RunItem[] = [];
    
    try {
      // Validate input
      if ((typeof query === 'string' && (!query || query.trim() === '')) || 
          (Array.isArray(query) && query.length === 0)) {
        throw new UserError('Empty query provided. Please provide a valid query.');
      }
      
      // Convert string query to array format if needed
      const inputItems = typeof query === 'string' 
        ? [{ role: 'user', content: query }] 
        : query;
      
      // Add user message to new items
      if (typeof query === 'string') {
        newItems.push({
          type: RunItemType.MESSAGE,
          timestamp: new Date().toISOString(),
          raw_item: { role: 'user', content: query }
        } as MessageOutputItem);
      }
      
      // Apply input guardrails if provided
      let processedQuery = typeof query === 'string' ? query : JSON.stringify(query);
      if (config?.input_guardrails && Array.isArray(config.input_guardrails)) {
        for (const guardrail of config.input_guardrails) {
          if (typeof guardrail === 'function') {
            const originalQuery = processedQuery;
            processedQuery = await guardrail(processedQuery);
            inputGuardrailResults.push({
              original: originalQuery,
              processed: processedQuery,
              guardrail: guardrail.name || 'unnamed_guardrail'
            });
          }
        }
      }
      
      // Run the agent with the query
      const response = await this.agent.handleTask(
        processedQuery, 
        {
          handoffTracker: handoffPath,
          maxTurns: max_turns,
          runConfig: config // Pass run configuration to the agent
        }
      );
      
      // Store raw responses
      if (response.rawResponses) {
        rawResponses.push(...response.rawResponses);
      }
      
      // Add any items from the agent response
      if (response.items && Array.isArray(response.items)) {
        newItems.push(...response.items);
      }
      
      // Process the response
      if (response.success) {
        let finalOutput = response.content;
        
        // Add response as message item
        newItems.push({
          type: RunItemType.MESSAGE,
          timestamp: new Date().toISOString(),
          raw_item: { role: 'assistant', content: finalOutput }
        } as MessageOutputItem);
        
        // Apply output guardrails if provided
        if (config?.output_guardrails && Array.isArray(config.output_guardrails)) {
          for (const guardrail of config.output_guardrails) {
            if (typeof guardrail === 'function') {
              const originalOutput = finalOutput;
              finalOutput = await guardrail(finalOutput);
              outputGuardrailResults.push({
                original: originalOutput,
                processed: finalOutput,
                guardrail: guardrail.name || 'unnamed_guardrail'
              });
            }
          }
        }
        
        // Determine final_output type
        let typedFinalOutput: any = finalOutput;
        if (this.agent.outputType && response.typedOutput) {
          typedFinalOutput = response.typedOutput;
        }
        
        const result: RunResult = {
          success: true,
          output: finalOutput,
          final_output: typedFinalOutput,
          metadata: {
            handoffPath: response.metadata?.handoffTracker || handoffPath,
            executionTimeMs: Date.now() - startTime,
            ...response.metadata
          },
          last_agent: this.agent, // Store the last agent that ran
          new_items: newItems,
          input_guardrail_results: inputGuardrailResults,
          output_guardrail_results: outputGuardrailResults,
          raw_responses: rawResponses,
          to_input_list: () => this.createInputList(inputItems, response)
        };
        
        await runTrace.finish();
        return result;
      } else {
        throw new Error(response.error || 'Unknown error occurred during processing');
      }
    } catch (error) {
      console.error('Run error:', error);
      
      // Determine if this is a known error type
      if (error instanceof AgentsException) {
        throw error; // Re-throw known exceptions
      }
      
      const result: RunResult = {
        success: false,
        output: '',
        final_output: '',
        error: error instanceof Error ? error.message : 'Unknown error during run',
        metadata: {
          handoffPath,
          executionTimeMs: Date.now() - startTime
        },
        last_agent: this.agent, // Store the last agent that ran
        new_items: newItems,
        input_guardrail_results: inputGuardrailResults,
        output_guardrail_results: outputGuardrailResults,
        raw_responses: rawResponses,
        to_input_list: () => typeof query === 'string' ? [{ role: 'user', content: query }] : query
      };
      
      await runTrace.finish();
      return result;
    }
  }

  /**
   * Synchronous version of run
   * @param query The user's query
   * @param config Configuration for this run
   * @param max_turns Maximum number of turns before raising MaxTurnsExceededError
   * @returns The result of running the agent
   */
  run_sync(query: string | any[], config?: RunConfig, max_turns: number = 25): RunResult {
    // Note: This is not truly synchronous as JavaScript doesn't support blocking on async operations.
    // In a production environment, you would need to use a different approach such as:
    // 1. Using a synchronous binding to the OpenAI API (if available)
    // 2. Using a worker thread approach 
    // 3. Changing your architecture to fully embrace async/await
    console.warn('run_sync is not truly synchronous - use run with await instead');
    
    // Create a promise that will be resolved when the async operation completes
    let promiseResult: Promise<RunResult> = this.run(query, config, max_turns);
    
    // Return a mock result that includes the actual promise
    // The caller will need to await this promise to get the actual result
    const mockResult: RunResult = {
      success: false,
      output: 'Pending...',
      final_output: 'Pending...',
      error: 'This is a placeholder. You must await the _promise property to get the actual result.',
      metadata: {
        executionTimeMs: 0,
        handoffPath: [this.agent.name]
      },
      last_agent: this.agent,
      new_items: [],
      input_guardrail_results: [],
      output_guardrail_results: [],
      raw_responses: [],
      // @ts-ignore - Adding a non-standard property to the result
      _promise: promiseResult,
      to_input_list: () => typeof query === 'string' ? [{ role: 'user', content: query }] : query
    };
    
    return mockResult;
  }

  /**
   * Stream the agent's execution process, providing updates at each step
   * @param query The user's query
   * @param callbacks Callbacks for the streaming process
   * @param config Configuration for this run
   * @param max_turns Maximum number of turns before raising MaxTurnsExceededError
   * @returns A streaming result object
   */
  async run_streamed(
    query: string | any[], 
    callbacks: StreamRunCallbacks,
    config?: RunConfig,
    max_turns: number = 25
  ): Promise<RunResultStreaming> {
    if (this.traceEnabled) {
      configureTracing(config);
    }
    
    // Create a trace for this run
    const runTrace = trace(config?.workflow_name || `${this.agent.name} run (streaming)`, config);
    const traceInstance = runTrace.start();
    
    const handoffPath: string[] = [this.agent.name]; // Track path of handoffs
    let events: AgentRunEvent[] = [];
    let finalResultContent = '';
    let finalResultSuccess = true;
    let finalResultMetadata: Record<string, any> = {};
    let inputGuardrailResults: any[] = [];
    let outputGuardrailResults: any[] = [];
    let rawResponses: any[] = [];
    let newItems: RunItem[] = [];
    let lastAgent: BaseAgent = this.agent;
    let typedOutput: any = null;
    
    try {
      // Notify that streaming has started
      callbacks.onStart?.();
      
      // Validate input
      if ((typeof query === 'string' && (!query || query.trim() === '')) || 
          (Array.isArray(query) && query.length === 0)) {
        throw new UserError('Empty query provided. Please provide a valid query.');
      }
      
      callbacks.onToken?.('Analyzing your query...\n\n');
      
      // Add initial event
      events.push({ 
        type: AgentRunEventType.START, 
        timestamp: new Date().toISOString(),
        agent: this.agent.name
      });
      
      // Convert string query to array format if needed
      const inputItems = typeof query === 'string' 
        ? [{ role: 'user', content: query }] 
        : query;
      
      // Add user message to new items
      if (typeof query === 'string') {
        newItems.push({
          type: RunItemType.MESSAGE,
          timestamp: new Date().toISOString(),
          raw_item: { role: 'user', content: query }
        } as MessageOutputItem);
      }
      
      // Apply input guardrails if provided
      let processedQuery = typeof query === 'string' ? query : JSON.stringify(query);
      if (config?.input_guardrails && Array.isArray(config.input_guardrails)) {
        for (const guardrail of config.input_guardrails) {
          if (typeof guardrail === 'function') {
            const originalQuery = processedQuery;
            processedQuery = await guardrail(processedQuery);
            inputGuardrailResults.push({
              original: originalQuery,
              processed: processedQuery,
              guardrail: guardrail.name || 'unnamed_guardrail'
            });
            events.push({ 
              type: 'guardrail_input', 
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      // Create handoff-aware wrapper callbacks with RunItem tracking
      const wrappedCallbacks: StreamCallbacks = {
        onStart: () => {
          callbacks.onStart?.();
          events.push({ 
            type: AgentRunEventType.AGENT_START, 
            agent: this.agent.name, 
            timestamp: new Date().toISOString() 
          });
        },
        onToken: (token) => {
          callbacks.onToken?.(token);
          events.push({ 
            type: AgentRunEventType.TOKEN, 
            content: token, 
            timestamp: new Date().toISOString() 
          });
        },
        onError: (error) => {
          callbacks.onError?.(error);
          events.push({ 
            type: AgentRunEventType.ERROR, 
            error: error instanceof Error ? error.message : String(error), 
            timestamp: new Date().toISOString() 
          });
        },
        onComplete: (result) => {
          callbacks.onComplete?.(result);
          
          // Store the result data in our local variables
          if (typeof result === 'string') {
            finalResultContent = result;
            finalResultSuccess = true;
          } else {
            finalResultContent = result.content || '';
            finalResultSuccess = result.success !== false;
            finalResultMetadata = result.metadata || {};
            
            // Add items from the agent response
            if (result.items && Array.isArray(result.items)) {
              newItems.push(...result.items);
            }
            
            // Store raw responses
            if (result.rawResponses && Array.isArray(result.rawResponses)) {
              rawResponses.push(...result.rawResponses);
            }
            
            // Store typed output if available
            if (result.typedOutput !== undefined) {
              typedOutput = result.typedOutput;
            }
          }
          
          // Add final assistant message item
          newItems.push({
            type: RunItemType.MESSAGE,
            timestamp: new Date().toISOString(),
            raw_item: { role: 'assistant', content: finalResultContent }
          } as MessageOutputItem);
          
          events.push({ 
            type: AgentRunEventType.AGENT_END, 
            result: typeof result === 'string' ? { content: result } : result, 
            timestamp: new Date().toISOString() 
          });
          
          // Add run end event
          events.push({ 
            type: AgentRunEventType.END, 
            timestamp: new Date().toISOString(),
            agent: lastAgent.name
          });
        },
        // Track handoffs in the streaming process
        onHandoff: (sourceAgentName: string, targetAgentName: string) => {
          // Get the target agent instance - handle type safely
          let targetAgent: BaseAgent | undefined = undefined;
          
          if (this.agent.handoffs) {
            // Find handoff target in a type-safe way
            for (const handoff of this.agent.handoffs) {
              if (typeof handoff === 'object' && 'name' in handoff && handoff.name === targetAgentName) {
                targetAgent = handoff as BaseAgent;
                break;
              }
            }
          }
          
          if (targetAgent) {
            lastAgent = targetAgent;
          }
          
          handoffPath.push(targetAgentName);
          callbacks.onToken?.(`\n\nHanding off from ${sourceAgentName} to ${targetAgentName}...\n\n`);
          
          // Create handoff items
          const handoffCallItem: HandoffCallItem = {
            type: RunItemType.HANDOFF_CALL,
            timestamp: new Date().toISOString(),
            raw_item: { from: sourceAgentName, to: targetAgentName }
          };
          
          const handoffOutputItem: Partial<HandoffOutputItem> = {
            type: RunItemType.HANDOFF_OUTPUT,
            timestamp: new Date().toISOString(),
            raw_item: { success: true, agent: targetAgentName },
            source_agent: this.agent
          };
          
          if (targetAgent) {
            handoffOutputItem.target_agent = targetAgent;
          }
          
          newItems.push(handoffCallItem);
          newItems.push(handoffOutputItem as HandoffOutputItem);
          
          events.push({ 
            type: AgentRunEventType.HANDOFF, 
            from: sourceAgentName, 
            to: targetAgentName, 
            timestamp: new Date().toISOString() 
          });
          
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
      await this.agent.streamTask(
        processedQuery, 
        wrappedCallbacks, 
        {
          handoffTracker: handoffPath,
          maxTurns: max_turns,
          runConfig: config // Pass run configuration to the agent
        }
      );
      
      await runTrace.finish();
      
      // Apply output guardrails if provided
      let processedOutput = finalResultContent;
      if (config?.output_guardrails && Array.isArray(config.output_guardrails)) {
        for (const guardrail of config.output_guardrails) {
          if (typeof guardrail === 'function') {
            const originalOutput = processedOutput;
            processedOutput = await guardrail(processedOutput);
            outputGuardrailResults.push({
              original: originalOutput,
              processed: processedOutput,
              guardrail: guardrail.name || 'unnamed_guardrail'
            });
            events.push({ 
              type: 'guardrail_output', 
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      // Create and return the streaming result
      const streamResult: RunResultStreaming = {
        success: finalResultSuccess,
        output: processedOutput,
        final_output: typedOutput !== null ? typedOutput : processedOutput,
        metadata: {
          handoffPath,
          executionTimeMs: 0, // Will be calculated
          ...finalResultMetadata
        },
        last_agent: lastAgent,
        new_items: newItems,
        input_guardrail_results: inputGuardrailResults,
        output_guardrail_results: outputGuardrailResults,
        raw_responses: rawResponses,
        to_input_list: () => this.createInputList(inputItems, {
          content: processedOutput,
          success: finalResultSuccess,
          metadata: finalResultMetadata
        }),
        stream_events: async function* () {
          for (const event of events) {
            yield event;
          }
        }
      };
      
      // Calculate execution time
      if (events.length >= 2) {
        const startTime = new Date(events[0].timestamp).getTime();
        const endTime = new Date(events[events.length - 1].timestamp).getTime();
        if (streamResult.metadata) {
          streamResult.metadata.executionTimeMs = endTime - startTime;
        }
      }
      
      return streamResult;
    } catch (error) {
      console.error('Streaming run error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error during streaming run'));
      
      // Record error event
      events.push({ 
        type: AgentRunEventType.ERROR, 
        error: error instanceof Error ? error.message : String(error), 
        timestamp: new Date().toISOString() 
      });
      
      await runTrace.finish();
      
      // Return a failure result
      const streamResult: RunResultStreaming = {
        success: false,
        output: '',
        final_output: '',
        error: error instanceof Error ? error.message : 'Unknown error during streaming run',
        metadata: {
          handoffPath,
          executionTimeMs: 0 // Will be calculated
        },
        last_agent: lastAgent,
        new_items: newItems,
        input_guardrail_results: inputGuardrailResults,
        output_guardrail_results: outputGuardrailResults,
        raw_responses: rawResponses,
        to_input_list: () => typeof query === 'string' ? [{ role: 'user', content: query }] : query,
        stream_events: async function* () {
          for (const event of events) {
            yield event;
          }
        }
      };
      
      // Calculate execution time if possible
      if (events.length >= 2) {
        const startTime = new Date(events[0].timestamp).getTime();
        const endTime = new Date(events[events.length - 1].timestamp).getTime();
        if (streamResult.metadata) {
          streamResult.metadata.executionTimeMs = endTime - startTime;
        }
      }
      
      return streamResult;
    }
  }
  
  /**
   * Create an input list for the next conversation turn
   */
  private createInputList(originalInput: any[], response: AgentResponse | undefined): any[] {
    if (!response) {
      return originalInput;
    }
    
    // Basic input list format with the previous exchange
    return [
      ...originalInput,
      { role: 'assistant', content: response.content }
    ];
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

  /**
   * Static method to run an agent on a query
   * Simplified to match OpenAI's Agent SDK pattern: Runner.run(agent, "query")
   * @param agent The agent to run
   * @param query The user's query as a string
   * @param config Optional configuration for this run
   * @returns Promise that resolves with the result
   */
  static async run(
    agent: BaseAgent, 
    query: string,
    config?: RunConfig
  ): Promise<RunResult> {
    const runner = new AgentRunner(agent);
    // Use default max_turns of 25
    return runner.run(query, config, 25);
  }
  
  /**
   * Static synchronous version of run
   * @param agent The agent to run
   * @param query The user's query
   * @param config Configuration for this run
   * @param max_turns Maximum number of turns before raising MaxTurnsExceededError
   * @returns The result of running the agent
   */
  static run_sync(
    agent: BaseAgent, 
    query: string | any[], 
    config?: RunConfig, 
    max_turns: number = 25
  ): RunResult {
    const runner = new AgentRunner(agent);
    return runner.run_sync(query, config, max_turns);
  }
  
  /**
   * Static streaming version of run
   * @param agent The agent to run
   * @param query The user's query
   * @param callbacks Callbacks for the streaming process
   * @param config Configuration for this run
   * @param max_turns Maximum number of turns before raising MaxTurnsExceededError
   * @returns A streaming result object
   */
  static async run_streamed(
    agent: BaseAgent,
    query: string | any[], 
    callbacks: StreamRunCallbacks,
    config?: RunConfig,
    max_turns: number = 25
  ): Promise<RunResultStreaming> {
    const runner = new AgentRunner(agent);
    return runner.run_streamed(query, callbacks, config, max_turns);
  }
}

// Export the DelegationAgent for backwards compatibility or direct use
export { TriageAgent, ResearchAgent, ReportAgent, TaskType }; 