// agents/agent.ts
import { Tool } from './tools';

export interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
  success: boolean;
  error?: string;
}

export interface AgentContext {
  [key: string]: any;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (finalResponse: AgentResponse) => void;
  onError?: (error: Error) => void;
  onHandoff?: (sourceAgentName: string, targetAgentName: string) => void;
}

// Input filter for handoffs, similar to the SDK
export type HandoffInputFilter = (input: any) => any;

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
  handoffs?: Agent[];
  outputType?: OutputType;
}

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
  handoffs: Agent[];
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