import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Global configuration
let globalOpenAIKey: string | undefined;
let globalOpenAIClient: OpenAI | undefined;
let tracingDisabled = false;
let tracingApiKey: string | undefined;

// Type definitions
type AgentConfig = {
  name: string;
  instructions: string;
  model?: string;
  modelSettings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  tools?: any[];
};

type RunConfig = {
  workflow_name?: string;
  trace_id?: string;
  group_id?: string;
  session_id?: string;
  model?: string;
  model_provider?: string;
  model_settings?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  trace_metadata?: Record<string, any>;
  tracing_disabled?: boolean;
};

type StreamCallbacks = {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onHandoff?: (from: string, to: string) => void;
  onError?: (error: any) => void;
  onComplete?: (result: any) => void;
};

type Trace = {
  id: string;
  workflow_name: string;
  group_id?: string;
  metadata?: Record<string, any>;
  started_at: Date;
  ended_at?: Date;
  spans: TraceSpan[];
};

type TraceSpan = {
  id: string;
  parent_id?: string;
  type: 'agent' | 'handoff' | 'function';
  name: string;
  data: Record<string, any>;
  started_at: Date;
  ended_at?: Date;
};

// Agent class implementation
export class Agent {
  name: string;
  instructions: string;
  model: string;
  modelSettings: Record<string, any>;
  handoffs: Agent[];
  tools: any[];

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model || 'gpt-4o';
    this.modelSettings = config.modelSettings || { temperature: 0.7 };
    this.handoffs = [];
    this.tools = config.tools || [];
  }

  // Clone with overrides
  clone(overrides: Partial<AgentConfig>): Agent {
    return new Agent({
      name: overrides.name || this.name,
      instructions: overrides.instructions || this.instructions,
      model: overrides.model || this.model,
      modelSettings: { ...this.modelSettings, ...overrides.modelSettings },
      tools: overrides.tools || this.tools
    });
  }

  // Process a message through this agent
  async process(message: string, history: any[] = []): Promise<{ content: string; handoff?: { agent: Agent; reason: string } }> {
    const client = getOpenAIClient();
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: this.instructions },
      ...history,
      { role: 'user', content: message }
    ];
    
    // Prepare handoff tools if needed
    let tools = [...this.tools];
    
    if (this.handoffs.length > 0) {
      const handoffTools = this.handoffs.map(agent => ({
        type: 'function',
        function: {
          name: `handoff_to_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
          description: `Transfer the conversation to the ${agent.name}`,
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'The reason for handing off to this agent'
              }
            },
            required: ['reason']
          }
        }
      }));
      
      tools = [...tools, ...handoffTools];
    }
    
    const response = await client.chat.completions.create({
      model: this.model,
      messages,
      temperature: this.modelSettings.temperature,
      top_p: this.modelSettings.topP,
      max_tokens: this.modelSettings.maxTokens,
      tools: tools.length > 0 ? tools : undefined
    });
    
    const content = response.choices[0].message.content || '';
    
    // Check for handoffs
    if (response.choices[0].message.tool_calls && response.choices[0].message.tool_calls.length > 0) {
      const toolCall = response.choices[0].message.tool_calls[0];
      const toolName = toolCall.function.name;
      
      if (toolName.startsWith('handoff_to_')) {
        const targetAgentName = toolName.replace('handoff_to_', '').replace(/_/g, ' ');
        const targetAgent = this.handoffs.find(a => 
          a.name.toLowerCase().replace(/\s+/g, '_') === targetAgentName.toLowerCase().replace(/\s+/g, '_')
        );
        
        if (targetAgent) {
          const args = JSON.parse(toolCall.function.arguments);
          return {
            content,
            handoff: {
              agent: targetAgent,
              reason: args.reason || 'No reason provided'
            }
          };
        }
      }
    }
    
    return { content };
  }
}

// Runner class implementation
export class Runner {
  private agent: Agent;
  private traceEnabled: boolean;
  private currentTrace?: Trace;
  
  constructor(agent: Agent, options: { traceEnabled?: boolean } = {}) {
    this.agent = agent;
    this.traceEnabled = options.traceEnabled !== false;
  }
  
  // Run the agent with a query
  async run(query: string, config?: RunConfig): Promise<any> {
    // Start tracing if enabled
    if (this.traceEnabled && !tracingDisabled && !(config?.tracing_disabled)) {
      this.currentTrace = this.startTrace(config);
    }
    
    const startTime = Date.now();
    let currentAgent = this.agent;
    let maxTurns = 10; // Prevent infinite loops
    let turns = 0;
    let history: any[] = [];
    
    try {
      // Process the query
      let agentSpan = this.startAgentSpan(currentAgent.name, query);
      let result = await currentAgent.process(query, history);
      this.endAgentSpan(agentSpan, result.content);
      
      // Update history
      history.push({ role: 'user', content: query });
      history.push({ role: 'assistant', content: result.content });
      
      // Handle handoffs
      let handoffPath = [currentAgent.name];
      
      while (result.handoff && turns < maxTurns) {
        turns++;
        
        // Create handoff span
        let handoffSpan = this.startHandoffSpan(
          currentAgent.name, 
          result.handoff.agent.name, 
          result.handoff.reason
        );
        
        // Switch to the target agent
        currentAgent = result.handoff.agent;
        handoffPath.push(currentAgent.name);
        
        // Create new agent span
        agentSpan = this.startAgentSpan(currentAgent.name, query);
        
        // Process with the new agent
        result = await currentAgent.process(query, history);
        
        // Update history
        history.push({ role: 'assistant', content: result.content });
        
        // End spans
        this.endAgentSpan(agentSpan, result.content);
        this.endHandoffSpan(handoffSpan);
      }
      
      // End tracing
      if (this.currentTrace) {
        this.currentTrace.ended_at = new Date();
      }
      
      return {
        success: true,
        output: result.content,
        final_output: result.content,
        metadata: {
          handoffPath,
          executionTimeMs: Date.now() - startTime,
          last_agent_name: currentAgent.name,
          last_agent_id: currentAgent.name,
          last_agent_type: currentAgent.name.split(' ')[0].toLowerCase(),
          trace_id: this.currentTrace?.id
        }
      };
    } catch (error) {
      // Handle errors
      return {
        success: false,
        output: '',
        final_output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTimeMs: Date.now() - startTime,
          trace_id: this.currentTrace?.id
        }
      };
    }
  }
  
  // Run the agent with streaming
  async run_streamed(query: string, callbacks: StreamCallbacks, config?: RunConfig): Promise<any> {
    // Similar to run but with streaming callbacks
    if (this.traceEnabled && !tracingDisabled && !(config?.tracing_disabled)) {
      this.currentTrace = this.startTrace(config);
    }
    
    if (callbacks.onStart) {
      callbacks.onStart();
    }
    
    const startTime = Date.now();
    let currentAgent = this.agent;
    
    try {
      // Get the OpenAI client
      const client = getOpenAIClient();
      
      // Create streaming completion
      const response = await client.chat.completions.create({
        model: currentAgent.model,
        messages: [
          { role: 'system', content: currentAgent.instructions },
          { role: 'user', content: query }
        ],
        temperature: currentAgent.modelSettings.temperature,
        stream: true
      });
      
      // Process streaming response
      let fullContent = '';
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (callbacks.onToken) {
            callbacks.onToken(content);
          }
        }
      }
      
      // Complete the stream
      if (callbacks.onComplete) {
        callbacks.onComplete({
          content: fullContent,
          metadata: {
            executionTimeMs: Date.now() - startTime,
            last_agent_name: currentAgent.name,
            trace_id: this.currentTrace?.id
          }
        });
      }
      
      // End tracing
      if (this.currentTrace) {
        this.currentTrace.ended_at = new Date();
      }
      
      return {
        success: true,
        output: fullContent,
        final_output: fullContent,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          last_agent_name: currentAgent.name,
          trace_id: this.currentTrace?.id
        }
      };
    } catch (error) {
      // Handle errors
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      
      return {
        success: false,
        output: '',
        final_output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTimeMs: Date.now() - startTime,
          trace_id: this.currentTrace?.id
        }
      };
    }
  }
  
  // Tracing methods
  private startTrace(config?: RunConfig): Trace {
    return {
      id: config?.trace_id || `trace_${uuidv4()}`,
      workflow_name: config?.workflow_name || `${this.agent.name} workflow`,
      group_id: config?.group_id,
      metadata: config?.trace_metadata,
      started_at: new Date(),
      spans: []
    };
  }
  
  private startAgentSpan(agentName: string, input: string): TraceSpan {
    const span: TraceSpan = {
      id: `span_${uuidv4()}`,
      type: 'agent',
      name: agentName,
      data: {
        agent_name: agentName,
        input
      },
      started_at: new Date()
    };
    
    if (this.currentTrace) {
      this.currentTrace.spans.push(span);
    }
    
    return span;
  }
  
  private endAgentSpan(span: TraceSpan, output: string): void {
    span.ended_at = new Date();
    span.data.output = output;
  }
  
  private startHandoffSpan(sourceAgent: string, targetAgent: string, reason: string): TraceSpan {
    const span: TraceSpan = {
      id: `span_${uuidv4()}`,
      type: 'handoff',
      name: `${sourceAgent} to ${targetAgent}`,
      data: {
        source_agent: sourceAgent,
        target_agent: targetAgent,
        reason
      },
      started_at: new Date()
    };
    
    if (this.currentTrace) {
      this.currentTrace.spans.push(span);
    }
    
    return span;
  }
  
  private endHandoffSpan(span: TraceSpan): void {
    span.ended_at = new Date();
  }
}

// Configuration functions
export function set_default_openai_key(apiKey: string): void {
  globalOpenAIKey = apiKey;
  // Reset client so it will be recreated with the new key
  globalOpenAIClient = undefined;
}

export function set_tracing_export_api_key(apiKey: string): void {
  tracingApiKey = apiKey;
}

export function set_tracing_disabled(disabled: boolean): void {
  tracingDisabled = disabled;
}

// Helper to get or create the OpenAI client
function getOpenAIClient(): OpenAI {
  if (!globalOpenAIClient) {
    globalOpenAIClient = new OpenAI({
      apiKey: globalOpenAIKey || process.env.OPENAI_API_KEY
    });
  }
  return globalOpenAIClient;
} 