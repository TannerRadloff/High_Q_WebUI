// agents/agent.ts

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
}

export interface Agent {
  name: string;
  handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse>;
  
  /**
   * Stream the response from the agent, calling the provided callbacks as tokens are generated.
   * @param userQuery The query or content to process
   * @param callbacks Callbacks for handling the streaming response
   * @param context Optional context information
   */
  streamTask?(
    userQuery: string, 
    callbacks: StreamCallbacks,
    context?: AgentContext
  ): Promise<void>;
} 