// agents/agent.ts
import { Tool } from './tools';
import { RunConfig } from './tracing';
import { RunItem } from '../runner';
import type { Handoff } from './handoff';

export type { Handoff };

export interface AgentResponse {
  content: string;
  success: boolean;
  error?: string;
  metadata?: {
    handoffTracker?: string[];
    [key: string]: any;
  };
  rawResponses?: any[]; // Raw LLM responses
  items?: RunItem[]; // Items generated during the agent run
  typedOutput?: any; // Type-specific output if an output_type is defined
  final_output?: string; // Final output matching OpenAI's Agent SDK pattern
}

export interface AgentContext {
  handoffTracker?: string[]; // Tracks chain of handoffs between agents
  maxTurns?: number; // Maximum number of conversation turns
  previousMessages?: any[]; // Message history if available
  memory?: any; // Memory for persistent state
  runConfig?: RunConfig; // Configuration for the current run
  originalQuery?: string; // Original user query for reference
  handoffReason?: string; // Reason for handoff when applicable
  isToolCall?: boolean; // Whether this context is from a tool call
  callerAgent?: string; // Name of the agent that called this one as a tool
  conversationHistory?: any[]; // Full conversation history if available
  userName?: string; // User's name or identifier
  relevantMemories?: any[]; // Relevant memories for the current context
  userId?: string; // User's unique identifier
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onError?: (error: Error | string) => void;
  onComplete?: (result: string | AgentResponse) => void;
  onHandoff?: (sourceAgentName: string, targetAgentName: string) => void;
}

// Input filter for handoffs, similar to the SDK
export type HandoffInputFilter = (source: string, target: string, input: any) => any;

/**
 * Configuration for an agent, similar to the OpenAI Agent SDK
 */
export interface AgentConfig<OutputType = any> {
  name: string;
  instructions: string | ((context: AgentContext) => string);
  model?: string;
  modelSettings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  tools?: Tool[];
  handoffs?: (Agent | Handoff)[];
  handoffInputFilter?: HandoffInputFilter; // Global input filter for all handoffs
  outputType?: OutputType;
}

/**
 * Agent interface matching OpenAI's Agent SDK patterns
 */
export interface Agent<OutputType = any> {
  name: string;
  instructions: string | ((context: AgentContext) => string);
  model: string;
  modelSettings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  tools: Tool[];
  handoffs: (Agent | Handoff)[];
  outputType?: OutputType;
  
  /**
   * Handles a task with the agent
   */
  handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse>;
  
  /**
   * Stream the response from the agent
   */
  streamTask?(
    userQuery: string, 
    callbacks: StreamCallbacks,
    context?: AgentContext
  ): Promise<void>;
  
  /**
   * Creates a copy of the agent with optional overrides
   * Similar to agent.clone() in the SDK
   */
  clone(overrides: Partial<AgentConfig>): Agent;
  
  /**
   * Converts this agent to a tool that can be used by other agents
   * Similar to agent.as_tool() in the SDK
   */
  asTool(toolName: string, toolDescription: string): Tool;
}

export interface HandoffOptions {
  toolNameOverride?: string;
  toolDescriptionOverride?: string;
  inputType?: any;
  onHandoff?: (context: AgentContext) => void;
} 