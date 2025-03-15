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
  handoffs?: (Agent | HandoffConfig)[];
};

type HandoffConfig = {
  agent: Agent;
  toolNameOverride?: string;
  toolDescriptionOverride?: string;
  inputSchema?: Record<string, any>;
  contextFilter?: (history: any[]) => any[];
  onHandoff?: (from: string, to: string, reason: string, data?: any) => void;
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
  onHandoff?: (from: string, to: string, reason: string, data?: any) => void;
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

// Handoff class implementation
export class Handoff {
  agent: Agent;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, any>;
  contextFilter?: (history: any[]) => any[];
  onHandoff?: (from: string, to: string, reason: string, data?: any) => void;

  constructor(config: HandoffConfig) {
    this.agent = config.agent;
    this.toolName = config.toolNameOverride || `handoff_to_${config.agent.name.toLowerCase().replace(/\s+/g, '_')}`;
    this.toolDescription = config.toolDescriptionOverride || `Transfer the conversation to the ${config.agent.name}`;
    
    // Default schema with reason field
    this.inputSchema = config.inputSchema || {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'The reason for handing off to this agent'
        }
      },
      required: ['reason']
    };
    
    this.contextFilter = config.contextFilter;
    this.onHandoff = config.onHandoff;
  }

  // Generate the function tool schema for this handoff
  generateToolSchema() {
    return {
      type: 'function',
      function: {
        name: this.toolName,
        description: this.toolDescription,
        parameters: this.inputSchema
      }
    };
  }

  // Process handoff and apply context filtering if needed
  processHandoff(from: string, history: any[], handoffData: any) {
    // Apply context filter if provided
    const filteredHistory = this.contextFilter ? this.contextFilter(history) : history;
    
    // Call onHandoff callback if provided
    if (this.onHandoff) {
      this.onHandoff(from, this.agent.name, handoffData.reason || 'No reason provided', handoffData);
    }
    
    return {
      agent: this.agent,
      history: filteredHistory,
      reason: handoffData.reason || 'No reason provided',
      data: handoffData
    };
  }
}

// Helper function to create a handoff
export function handoff(config: HandoffConfig): Handoff {
  return new Handoff(config);
}

// Agent class implementation
export class Agent {
  name: string;
  instructions: string;
  model: string;
  modelSettings: Record<string, any>;
  handoffs: Handoff[];
  tools: any[];

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model || 'gpt-4o';
    this.modelSettings = config.modelSettings || { temperature: 0.7 };
    this.tools = config.tools || [];
    
    // Process handoffs
    this.handoffs = [];
    if (config.handoffs && config.handoffs.length > 0) {
      config.handoffs.forEach(h => {
        if (h instanceof Agent) {
          // Convert Agent to Handoff
          this.handoffs.push(new Handoff({ agent: h }));
        } else if (h instanceof Handoff) {
          this.handoffs.push(h);
        } else {
          this.handoffs.push(new Handoff(h as HandoffConfig));
        }
      });
    }
  }

  // Clone with overrides
  clone(overrides: Partial<AgentConfig>): Agent {
    return new Agent({
      name: overrides.name || this.name,
      instructions: overrides.instructions || this.instructions,
      model: overrides.model || this.model,
      modelSettings: { ...this.modelSettings, ...overrides.modelSettings },
      tools: overrides.tools || this.tools,
      handoffs: overrides.handoffs || this.handoffs
    });
  }

  // Process a message through this agent
  async process(message: string, history: any[] = []): Promise<{ 
    content: string; 
    handoff?: { 
      handoff: Handoff; 
      agent: Agent; 
      reason: string; 
      data: any; 
      history: any[]
    } 
  }> {
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
      const handoffTools = this.handoffs.map(handoff => handoff.generateToolSchema());
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
      
      // Find matching handoff by tool name
      const matchedHandoff = this.handoffs.find(h => h.toolName === toolName);
      
      if (matchedHandoff) {
        const handoffData = JSON.parse(toolCall.function.arguments);
        const handoffResult = matchedHandoff.processHandoff(this.name, history, handoffData);
        
        return {
          content,
          handoff: {
            handoff: matchedHandoff,
            agent: handoffResult.agent,
            reason: handoffResult.reason,
            data: handoffResult.data,
            history: handoffResult.history
          }
        };
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
      let handoffData: Record<string, any>[] = [];
      
      while (result.handoff && turns < maxTurns) {
        turns++;
        
        // Create handoff span with enhanced data
        let handoffSpan = this.startHandoffSpan(
          currentAgent.name, 
          result.handoff.agent.name, 
          result.handoff.reason,
          result.handoff.data
        );
        
        // Track handoff data
        handoffData.push({
          from: currentAgent.name,
          to: result.handoff.agent.name,
          reason: result.handoff.reason,
          data: result.handoff.data
        });
        
        // Switch to the target agent
        currentAgent = result.handoff.agent;
        handoffPath.push(currentAgent.name);
        
        // Use filtered history if provided
        history = result.handoff.history;
        
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
          handoffData,
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
    let history: any[] = [];
    let maxTurns = 10;
    let turns = 0;
    
    try {
      let result: { 
        content: string; 
        handoff?: { 
          handoff: Handoff; 
          agent: Agent; 
          reason: string; 
          data: any; 
          history: any[] 
        } 
      } = { content: '' };
      
      let handoffPath = [currentAgent.name];
      let handoffData: Record<string, any>[] = [];
      
      do {
        // Get the OpenAI client
        const client = getOpenAIClient();
        
        // Prepare messages
        const messages = [
          { role: 'system', content: currentAgent.instructions },
          ...history,
          { role: 'user', content: query }
        ];
        
        // Prepare tools
        let tools = [...currentAgent.tools];
        if (currentAgent.handoffs.length > 0) {
          const handoffTools = currentAgent.handoffs.map(handoff => handoff.generateToolSchema());
          tools = [...tools, ...handoffTools];
        }
        
        // Create streaming completion
        const response = await client.chat.completions.create({
          model: currentAgent.model,
          messages,
          temperature: currentAgent.modelSettings.temperature,
          tools: tools.length > 0 ? tools : undefined,
          stream: true
        });
        
        // Process streaming response
        let fullContent = '';
        let messageToolCalls: any[] = [];
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          
          // Handle tool calls in chunks
          if (chunk.choices[0]?.delta?.tool_calls) {
            const toolCallChunks = chunk.choices[0].delta.tool_calls;
            for (const toolCallChunk of toolCallChunks) {
              // Initialize or update tool calls
              if (!messageToolCalls[toolCallChunk.index]) {
                messageToolCalls[toolCallChunk.index] = {
                  id: toolCallChunk.id || `call_${uuidv4()}`,
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }
              
              if (toolCallChunk.function?.name) {
                messageToolCalls[toolCallChunk.index].function.name += toolCallChunk.function.name;
              }
              
              if (toolCallChunk.function?.arguments) {
                messageToolCalls[toolCallChunk.index].function.arguments += toolCallChunk.function.arguments;
              }
            }
          }
          
          if (content) {
            fullContent += content;
            if (callbacks.onToken) {
              callbacks.onToken(content);
            }
          }
        }
        
        // Process tool calls if any
        if (messageToolCalls.length > 0) {
          const toolCall = messageToolCalls[0]; // Just handle first tool call for now
          const toolName = toolCall.function.name;
          
          // Find matching handoff
          const matchedHandoff = currentAgent.handoffs.find(h => h.toolName === toolName);
          
          if (matchedHandoff) {
            try {
              const handoffArgs = JSON.parse(toolCall.function.arguments);
              const handoffResult = matchedHandoff.processHandoff(currentAgent.name, history, handoffArgs);
              
              // Notify about handoff
              if (callbacks.onHandoff) {
                callbacks.onHandoff(
                  currentAgent.name, 
                  matchedHandoff.agent.name, 
                  handoffResult.reason,
                  handoffResult.data
                );
              }
              
              // Track handoff
              handoffData.push({
                from: currentAgent.name,
                to: matchedHandoff.agent.name,
                reason: handoffResult.reason,
                data: handoffResult.data
              });
              
              // Update agent and history
              currentAgent = matchedHandoff.agent;
              handoffPath.push(currentAgent.name);
              history = handoffResult.history;
              
              // Add handoff message to history
              history.push({ 
                role: 'assistant', 
                content: `I'm transferring you to our ${currentAgent.name}. ${handoffResult.reason}`
              });
              
              // Continue to next turn with new agent
              turns++;
              result = { 
                content: fullContent, 
                handoff: { 
                  handoff: matchedHandoff, 
                  agent: currentAgent, 
                  reason: handoffResult.reason, 
                  data: handoffResult.data, 
                  history 
                }
              };
            } catch (error) {
              console.error('Error during handoff:', error);
              result.handoff = undefined;
            }
          } else {
            // Not a handoff, process normal tool call response
            result.handoff = undefined;
          }
        } else {
          // No tool calls, just regular message
          history.push({ role: 'user', content: query });
          history.push({ role: 'assistant', content: fullContent });
          result = { content: fullContent, handoff: undefined };
        }
        
      } while (result.handoff && turns < maxTurns);
      
      // Complete the stream
      if (callbacks.onComplete) {
        callbacks.onComplete({
          content: result.content,
          metadata: {
            executionTimeMs: Date.now() - startTime,
            handoffPath,
            handoffData,
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
        output: result.content,
        final_output: result.content,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          handoffPath,
          handoffData,
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
  
  private startHandoffSpan(sourceAgent: string, targetAgent: string, reason: string, data?: any): TraceSpan {
    const span: TraceSpan = {
      id: `span_${uuidv4()}`,
      type: 'handoff',
      name: `${sourceAgent} to ${targetAgent}`,
      data: {
        source_agent: sourceAgent,
        target_agent: targetAgent,
        reason,
        handoff_data: data
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