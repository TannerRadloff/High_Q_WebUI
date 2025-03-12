import OpenAI from 'openai';
import { Agent, AgentConfig, AgentContext, AgentResponse, StreamCallbacks, HandoffInputFilter } from './agent';
import { Tool, agentAsTool } from './tools';
import { generation_span, handoff_span, agent_span, SpanType, TraceMetadata, RunConfig } from './tracing';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { MemoryManager, InMemoryStorage, MemoryType } from './memory';
import { 
  openaiClient, 
  includeSensitiveData, 
  prepareToolsForAPI, 
  prepareCompletionParams, 
  prepareStreamingParams,
  callOpenAI,
  streamOpenAI
} from './api-utils';
import { MaxTurnsExceededError } from '../runner';
import { Handoff, defaultToolName, defaultToolDescription } from './handoff';

// Type for OpenAI API response
type OpenAIResponse = {
  output_text: string;
  tool_calls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

/**
 * Base implementation of an Agent that aligns with OpenAI Agent SDK patterns
 */
export class BaseAgent<OutputType = string> implements Agent<OutputType> {
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
  protected memory?: MemoryManager;
  protected handoffInputFilter?: HandoffInputFilter;
  handoffCallbacks: Map<string, (ctx: AgentContext, inputData?: any) => void | Promise<void>>;
  handoffInputTypes: Map<string, z.ZodType<any>>;
  handoffInputFilters: Map<string, HandoffInputFilter>;
  handoffToolNames: Map<string, string>;
  handoffToolDescriptions: Map<string, string>;

  constructor(config: AgentConfig<OutputType>) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model || 'gpt-4o';
    this.modelSettings = config.modelSettings || { temperature: 0.7 };
    this.tools = config.tools || [];
    this.handoffs = config.handoffs || [];
    this.outputType = config.outputType;
    this.handoffInputFilter = config.handoffInputFilter;
    
    // Maps for handoff customizations
    this.handoffCallbacks = new Map();
    this.handoffInputTypes = new Map();
    this.handoffInputFilters = new Map();
    this.handoffToolNames = new Map();
    this.handoffToolDescriptions = new Map();
    
    // Process handoffs to extract customizations
    this.processHandoffs();
    
    // Initialize memory if not provided
    if (!this.memory && config.name) {
      const storage = new InMemoryStorage();
      this.memory = new MemoryManager(storage, config.name);
    }
  }

  /**
   * Process the handoffs array to extract customizations
   */
  private processHandoffs(): void {
    this.handoffs.forEach(handoffItem => {
      let agent: Agent;
      let customHandoff: Handoff | null = null;
      
      // Check if it's a direct Agent or a Handoff object
      if ('handleTask' in handoffItem) {
        agent = handoffItem as Agent;
      } else {
        customHandoff = handoffItem as Handoff;
        agent = customHandoff.agent;
      }
      
      // Create a unique key for this agent
      const agentKey = agent.name.toLowerCase().replace(/\s+/g, '_');
      
      if (customHandoff) {
        // Store customizations if provided
        if (customHandoff.onHandoff) {
          this.handoffCallbacks.set(agentKey, customHandoff.onHandoff);
        }
        
        if (customHandoff.inputType) {
          this.handoffInputTypes.set(agentKey, customHandoff.inputType);
        }
        
        if (customHandoff.inputFilter) {
          this.handoffInputFilters.set(agentKey, customHandoff.inputFilter);
        }
        
        if (customHandoff.toolNameOverride) {
          this.handoffToolNames.set(agentKey, customHandoff.toolNameOverride);
        }
        
        if (customHandoff.toolDescriptionOverride) {
          this.handoffToolDescriptions.set(agentKey, customHandoff.toolDescriptionOverride);
        }
      }
    });
  }

  /**
   * Utility method to count citations in text
   * This makes citation counting available to all agents
   */
  countCitations(text: string): number {
    const citationPattern = /\[\d+\]/g;
    const matches = text.match(citationPattern);
    return matches ? matches.length : 0;
  }

  /**
   * Get the resolved instructions string, handling dynamic instructions
   */
  resolveInstructions(context?: AgentContext): string {
    if (typeof this.instructions === 'function') {
      return this.instructions(context || {});
    }
    return this.instructions;
  }

  /**
   * Handle tool calls from the model response, including executing tools and handling handoffs
   */
  async handleToolCalls(
    toolCalls: any[], 
    context?: AgentContext, 
    conversationHistory?: any[], 
    runConfig?: RunConfig
  ): Promise<{ toolResults: any[], handoffResult?: AgentResponse }> {
    const toolResults = [];
    let handoffResult: AgentResponse | undefined = undefined;

    for (const toolCall of toolCalls) {
      const { id, function: { name, arguments: argsStr } } = toolCall;
      
      try {
        // Check if this is a handoff tool call by matching against our custom tool names
        const isHandoff = name.startsWith('transfer_to_') || 
          [...this.handoffToolNames.values()].includes(name);
        
        if (isHandoff) {
          // Parse arguments
          const handoffArgs = JSON.parse(argsStr);
          const reason = handoffArgs.reason || 'No reason provided';
          
          // Find the target agent by matching the tool name
          let targetAgent: Agent | null = null;
          let targetAgentKey = '';
          
          // First check if it's a custom tool name
          for (const [key, toolName] of this.handoffToolNames.entries()) {
            if (toolName === name) {
              targetAgentKey = key;
              break;
            }
          }
          
          // If not found, check if it's a default tool name (transfer_to_<agent_name>)
          if (!targetAgentKey && name.startsWith('transfer_to_')) {
            const agentNameFromTool = name.replace('transfer_to_', '').toLowerCase();
            targetAgentKey = agentNameFromTool;
          }
          
          // Find the actual agent from the handoffs array
          for (const handoffItem of this.handoffs) {
            const agent = 'handleTask' in handoffItem ? 
              handoffItem as Agent : 
              (handoffItem as Handoff).agent;
            
            const agentKey = agent.name.toLowerCase().replace(/\s+/g, '_');
            if (agentKey === targetAgentKey) {
              targetAgent = agent;
              break;
            }
          }
          
          if (targetAgent) {
            // Create a span for the handoff
            const handoffSpanWrapper = handoff_span(this.name, targetAgent.name, {
              source_agent: this.name,
              target_agent: targetAgent.name,
              reason
            });
            
            try {
              handoffSpanWrapper.enter();
              
              // If we have conversation history, pass it to the target agent to maintain context
              let handoffContext = context ? { ...context } : {};
              
              // Track the handoff in the context
              if (!handoffContext.handoffTracker) {
                handoffContext.handoffTracker = [];
              }
              
              if (Array.isArray(handoffContext.handoffTracker)) {
                handoffContext.handoffTracker.push(targetAgent.name);
              }
              
              // Add the reason for handoff to context
              handoffContext.handoffReason = reason;
              
              // Prepare input for the target agent
              let handoffInput = conversationHistory 
                ? { messages: conversationHistory }
                : { messages: [{ role: 'user', content: context?.originalQuery || 'Please help with this task' }] };
              
              // Call the onHandoff callback if it exists
              const onHandoffCallback = this.handoffCallbacks.get(targetAgentKey);
              if (onHandoffCallback) {
                // Check if we have an input type for this handoff
                const inputType = this.handoffInputTypes.get(targetAgentKey);
                if (inputType) {
                  try {
                    // Parse and validate the input data
                    const parsedData = inputType.parse(handoffArgs);
                    await onHandoffCallback(handoffContext, parsedData);
                  } catch (error) {
                    console.error(`Error parsing handoff input data: ${error}`);
                    await onHandoffCallback(handoffContext);
                  }
                } else {
                  await onHandoffCallback(handoffContext);
                }
              }
              
              // Apply input filter for this specific handoff if available
              const specificInputFilter = this.handoffInputFilters.get(targetAgentKey);
              if (specificInputFilter) {
                handoffInput = specificInputFilter(handoffInput);
              } 
              // Otherwise apply the global input filter if available
              else if (this.handoffInputFilter) {
                handoffInput = this.handoffInputFilter(handoffInput);
              }
              
              // Process the handoff - extract the latest user message
              const latestUserMessage = handoffInput.messages
                ? handoffInput.messages.findLast((msg: any) => msg.role === 'user')?.content
                : context?.originalQuery || 'Please help with this task';
              
              // Call the target agent's handleTask method
              handoffResult = await targetAgent.handleTask(latestUserMessage, handoffContext);
              
              // Mark this handoff as used in the tool results
              toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: JSON.stringify({ 
                  success: true, 
                  message: `Successfully handed off to ${targetAgent.name}` 
                })
              });
              
              // No need to process further tool calls after a handoff
              break;
            } catch (error) {
              console.error(`Error during handoff to ${targetAgent.name}: ${error}`);
              handoffSpanWrapper.exit();
              
              // Add error to tool results
              toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: JSON.stringify({ 
                  success: false, 
                  error: `Handoff to ${targetAgent.name} failed: ${error}` 
                })
              });
            }
          } else {
            // Target agent not found
            toolResults.push({
              tool_call_id: id,
              role: 'tool',
              name,
              content: JSON.stringify({ 
                success: false, 
                error: `Target agent not found for handoff: ${name}` 
              })
            });
          }
        } else {
          // Regular tool execution
          const tool = this.tools.find(t => t.name === name);
          if (tool) {
            try {
              const args = JSON.parse(argsStr);
              const result = await tool.execute(args);
              toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: result
              });
            } catch (error) {
              toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          } else {
            toolResults.push({
              tool_call_id: id,
              role: 'tool',
              name,
              content: `Error: Tool ${name} not found`
            });
          }
        }
      } catch (error) {
        console.error(`Error processing tool call ${name}: ${error}`);
        toolResults.push({
          tool_call_id: id,
          role: 'tool',
          name,
          content: JSON.stringify({ success: false, error: `${error}` })
        });
      }
    }

    return { toolResults, handoffResult };
  }

  /**
   * Get memories to enhance the context for a task
   */
  protected async getMemoryEnhancedContext(userQuery: string, context?: AgentContext): Promise<AgentContext> {
    if (!this.memory || !context) {
      return context || {};
    }
    
    try {
      return await this.memory.enhanceContext(context, userQuery);
    } catch (error) {
      console.error('Error enhancing context with memories:', error);
      return context;
    }
  }
  
  /**
   * Store a memory from the interaction
   */
  protected async storeMemory(userQuery: string, response: AgentResponse): Promise<void> {
    if (!this.memory) {
      return;
    }
    
    try {
      // Store the interaction as conversation memory
      await this.memory.addConversationMemory(
        userQuery,
        typeof response === 'string' ? response : response.content
      );
      
      // For important insights, store as long-term memory
      if (response.metadata?.important) {
        await this.memory.store(
          typeof response === 'string' ? response : response.content,
          MemoryType.LONG_TERM,
          { 
            query: userQuery,
            importance: response.metadata?.importance || 'medium',
            tags: response.metadata?.tags || []
          }
        );
      }
    } catch (error) {
      console.error('Error storing memory:', error);
    }
  }

  /**
   * Handles a task with the agent
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    // Extract the original query and run configuration if provided
    const originalQuery = typeof userQuery === 'string' ? userQuery : '';
    const runConfig = context?.runConfig as RunConfig | undefined;
    
    // Set up context with original query
    const enhancedContext = await this.getMemoryEnhancedContext(userQuery, {
      ...(context || {}),
      originalQuery
    });
    
    // Track turns to prevent infinite loops
    const maxTurns = enhancedContext.maxTurns || 25;
    let currentTurn = 0;
    let conversationHistory: any[] = [{ role: 'user', content: userQuery }];
    
    // Create a trace span for this agent's execution
    const agentSpanWrapper = agent_span(`${this.name} execution`, {
      agent_name: this.name,
      agent_instructions: this.resolveInstructions(enhancedContext),
      input: userQuery
    });
    
    try {
      agentSpanWrapper.enter();
      let finalResponse: AgentResponse | undefined = undefined;
      
      while (currentTurn < maxTurns) {
        currentTurn++;
        
        // Prepare the LLM call with the conversation history
        const formattedTools = this.prepareTools(enhancedContext);
        
        // Prepare API parameters for LLM call
        const requestParams = prepareCompletionParams({
          model: this.model,
          messages: conversationHistory,
          temperature: this.modelSettings?.temperature,
          top_p: this.modelSettings?.topP,
          max_tokens: this.modelSettings?.maxTokens,
        }, formattedTools);
        
        // Call the OpenAI API
        const response = await callOpenAI(requestParams);
        
        // Extract the response message
        const aiOutput = {
          output_text: response.choices[0].message.content || '',
          tool_calls: response.choices[0].message.tool_calls
        };
        
        // Check if there are tool calls to process
        if (aiOutput.tool_calls && aiOutput.tool_calls.length > 0) {
          const { toolResults, handoffResult } = await this.handleToolCalls(
            aiOutput.tool_calls, 
            enhancedContext, 
            conversationHistory,
            runConfig
          );
          
          // If we got a handoff result, use that as the final output
          if (handoffResult) {
            finalResponse = handoffResult;
            break;
          }
          
          // Add the tool results to the conversation history
          conversationHistory = [...conversationHistory, ...toolResults];
        } else if (aiOutput.output_text) {
          // No tool calls - we have a final response
          finalResponse = {
            content: aiOutput.output_text,
            success: true
          };
          break;
        } else {
          // Unexpected response format
          finalResponse = {
            content: 'Error: Unable to parse AI response',
            success: false,
            error: 'Invalid response format from OpenAI API'
          };
          break;
        }
      }
      
      // Check if we hit the max turns limit
      if (currentTurn >= maxTurns && !finalResponse) {
        throw new MaxTurnsExceededError(`Maximum number of turns (${maxTurns}) exceeded in agent execution`);
      }
      
      // Return the final response
      const result: AgentResponse = finalResponse || {
        content: 'Error: No response generated',
        success: false,
        error: 'No response generated after multiple turns'
      };
      
      agentSpanWrapper.addData({
        output: result.content,
        success: result.success
      });
      
      agentSpanWrapper.exit();
      
      return result;
    } catch (error) {
      console.error(`Error in ${this.name} agent:`, error);
      
      agentSpanWrapper.addData({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      
      agentSpanWrapper.exit();
      
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Stream the response from the agent
   */
  async streamTask(
    userQuery: string,
    callbacks: StreamCallbacks,
    context?: AgentContext
  ): Promise<void> {
    try {
      if (!userQuery || userQuery.trim() === '') {
        callbacks.onError?.(new Error(`Empty query provided. Please provide a valid query for ${this.name}.`));
        return;
      }

      callbacks.onStart?.();
      const instructions = this.resolveInstructions(context);
      
      // Get prepared tools
      const formattedTools = this.prepareTools(context);
      
      // Prepare streaming parameters
      const streamParams = prepareStreamingParams({
        model: this.model,
        instructions: instructions,
        input: userQuery,
        temperature: this.modelSettings?.temperature,
        top_p: this.modelSettings?.topP,
        max_tokens: this.modelSettings?.maxTokens,
      }, formattedTools);
      
      // Extract conversation history from context if available
      const conversationHistory = context?.conversationHistory || [];
      
      // Log full params for debugging
      console.log('Creating streaming response with params:', JSON.stringify(streamParams, null, 2));
      
      // Stream the response
      const stream = await streamOpenAI(streamParams);
      
      let content = '';
      let toolCalls: any[] = [];
      let isCollectingToolCall = false;
      let currentToolCall: string = '';
      let maxTurns = context?.maxTurns || 25; // Use context value or default
      let executionComplete = false;
      
      // Stream processing loop
      try {
        for await (const chunk of stream) {
          // Check for max turns exceeded
          if (maxTurns <= 0 && !executionComplete) {
            const error = new MaxTurnsExceededError(`Maximum number of turns (${context?.maxTurns || 25}) exceeded for agent ${this.name}`);
            callbacks.onError?.(error);
            return;
          }
          
          // Handle different types of chunks in the stream
          if ('delta' in chunk && chunk.delta && typeof chunk.delta === 'object') {
            if ('text' in chunk.delta && chunk.delta.text) {
              const newContent = chunk.delta.text;
              callbacks.onToken?.(newContent);
              content += newContent;
            } else if ('tool_calls' in chunk.delta && chunk.delta.tool_calls) {
              // We're starting to collect a tool call
              isCollectingToolCall = true;
              
              // Only notify the client that we're processing a tool call on the first chunk
              if (!currentToolCall) {
                callbacks.onToken?.("\n\nProcessing your request...");
              }
              
              // Accumulate the tool call - this is simplified and would need to be more robust
              // in a production implementation that handles partial JSON correctly
              if (typeof chunk.delta.tool_calls === 'string') {
                currentToolCall += chunk.delta.tool_calls;
              } else if (Array.isArray(chunk.delta.tool_calls)) {
                // Each item in the array might be a partial tool call
                chunk.delta.tool_calls.forEach((call: any) => {
                  if (call && call.function && call.function.arguments) {
                    currentToolCall += call.function.arguments;
                  }
                });
              }
            }
          } else if (chunk.type === 'tool_calls') {
            // This is the final tool call data
            isCollectingToolCall = false;
            toolCalls = chunk.tool_calls;
            
            // Process tool calls, which may include handoffs
            const { toolResults, handoffResult } = await this.handleToolCalls(
              toolCalls, 
              context,
              [...conversationHistory, { role: 'user', content: userQuery }]
            );
            
            // If a handoff occurred, we need to stream with the target agent
            if (handoffResult) {
              // Find which tool call was a handoff
              const handoffCall = toolCalls.find(call => 
                call.function.name.startsWith('transfer_to_')
              );
              
              if (handoffCall) {
                const targetAgentName = handoffCall.function.name
                  .replace('transfer_to_', '')
                  .replace(/_/g, ' ');
                
                // Notify about the handoff
                callbacks.onHandoff?.(this.name, targetAgentName);
                
                // Assume handoffResult contains success/content/etc 
                callbacks.onComplete?.(handoffResult);
                return;
              }
            }
            
            // If we have tool results but no handoff, continue with the next part of the conversation
            // This would be handled by calling the API again with tool results in a real implementation
            callbacks.onToken?.("\n\nProcessing tool results...\n\n");
            
            // Prepare streaming parameters with tool results
            const followUpParams = prepareStreamingParams({
              model: this.model,
              instructions: instructions,
              input: userQuery, 
              tool_results: toolResults,
              stream: false
            });
            
            // Here we would stream the follow-up response with tool results
            // This is a simplified implementation
            const followUpResponse = await streamOpenAI(followUpParams) as unknown as OpenAIResponse;
            
            callbacks.onToken?.(followUpResponse.output_text);
            content += followUpResponse.output_text;
          }
        }
        
        // Process tool calls if any were collected
        if (toolCalls.length > 0) {
          maxTurns--; // Decrement turn counter for tool processing
          
          // Process tool calls, which may include handoffs
          const { toolResults, handoffResult } = await this.handleToolCalls(
            toolCalls, 
            context,
            [...conversationHistory, { role: 'user', content: userQuery }]
          );
          
          // If a handoff occurred, we need to stream with the target agent
          if (handoffResult) {
            // Find which tool call was a handoff
            const handoffCall = toolCalls.find(call => 
              call.function.name.startsWith('transfer_to_')
            );
            
            if (handoffCall) {
              const targetAgentName = handoffCall.function.name
                .replace('transfer_to_', '')
                .replace(/_/g, ' ');
              
              // Notify about the handoff
              callbacks.onHandoff?.(this.name, targetAgentName);
              
              // Assume handoffResult contains success/content/etc 
              callbacks.onComplete?.(handoffResult);
              return;
            }
          }
          
          // If we have tool results but no handoff, continue with the next part of the conversation
          // This would be handled by calling the API again with tool results in a real implementation
          callbacks.onToken?.("\n\nProcessing tool results...\n\n");
          
          // Prepare streaming parameters with tool results
          const followUpParams = prepareStreamingParams({
            model: this.model,
            instructions: instructions,
            input: userQuery, 
            tool_results: toolResults,
            stream: false
          });
          
          // Here we would stream the follow-up response with tool results
          // This is a simplified implementation
          const followUpResponse = await streamOpenAI(followUpParams) as unknown as OpenAIResponse;
          
          callbacks.onToken?.(followUpResponse.output_text);
          content += followUpResponse.output_text;
        }
      } catch (streamError) {
        console.error('Stream processing error:', streamError);
        callbacks.onError?.(new Error(`Stream processing error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`));
        return;
      }
      
      callbacks.onComplete?.({
        success: true,
        content,
        metadata: {
          model: this.model,
          query: userQuery,
          context,
          agent: this.name
        }
      });
    } catch (error) {
      console.error(`${this.name} stream error:`, error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Creates a copy of the agent with optional overrides
   */
  clone(overrides: Partial<AgentConfig>): Agent {
    return new BaseAgent({
      name: this.name,
      instructions: this.instructions,
      model: this.model,
      modelSettings: this.modelSettings,
      tools: this.tools,
      handoffs: this.handoffs,
      outputType: this.outputType,
      ...overrides
    });
  }

  /**
   * Converts this agent into a Tool that can be used by other agents
   * 
   * @param name - The name of the tool
   * @param description - A description of what the tool does
   * @param customSchema - Optional custom schema for the tool
   * @returns A Tool object that can be used by other agents
   */
  asTool(name: string, description: string, customSchema?: object): Tool {
    // Define parameters using zod schema
    const parameters = z.object({
      input: z.string().describe("The input to send to the agent"),
      context: z.record(z.any()).optional().describe("Additional context for the agent")
    });
    
    // Define JSON schema for parameters
    const parametersSchema = customSchema || {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "The input to send to the agent"
        },
        context: {
          type: "object",
          description: "Additional context for the agent",
          additionalProperties: true
        }
      },
      required: ["input"]
    };
    
    return {
      name,
      description,
      parameters,
      parametersSchema,
      execute: async (args: any): Promise<string> => {
        try {
          const { input, context = {} } = args;
          
          // Set up monitoring
          const metadata = {
            tool_name: name,
            agent_name: this.name,
            input
          };
          
          // Execute the task
          const response = await this.handleTask(input, {
            ...context,
            isToolCall: true,
            callerAgent: context.callerAgent || 'unknown'
          });
          
          // Format the response
          if (typeof response === 'string') {
            return response;
          } else {
            return JSON.stringify(response);
          }
        } catch (error: any) {
          console.error(`Error executing agent as tool ${name}:`, error);
          throw new Error(`Tool ${name} failed: ${error.message || 'Unknown error'}`);
        }
      }
    };
  }

  /**
   * Prepare tools for the OpenAI API, including handoffs
   */
  prepareTools(context?: AgentContext): any[] {
    const tools = prepareToolsForAPI(this.tools);
    
    // Create handoff tools
    const handoffTools = this.handoffs.map(handoffItem => {
      let agent: Agent;
      let toolName: string;
      let toolDescription: string;
      
      // Check if it's a direct Agent or a Handoff object
      if ('handleTask' in handoffItem) {
        agent = handoffItem as Agent;
        const agentKey = agent.name.toLowerCase().replace(/\s+/g, '_');
        
        // Use custom tool name if available, otherwise use default
        toolName = this.handoffToolNames.get(agentKey) || defaultToolName(agent.name);
        
        // Use custom tool description if available, otherwise use default
        toolDescription = this.handoffToolDescriptions.get(agentKey) || defaultToolDescription(agent.name);
      } else {
        const handoff = handoffItem as Handoff;
        agent = handoff.agent;
        const agentKey = agent.name.toLowerCase().replace(/\s+/g, '_');
        
        // Use custom tool name if available, otherwise use default
        toolName = handoff.toolNameOverride || this.handoffToolNames.get(agentKey) || defaultToolName(agent.name);
        
        // Use custom tool description if available, otherwise use default
        toolDescription = handoff.toolDescriptionOverride || this.handoffToolDescriptions.get(agentKey) || defaultToolDescription(agent.name);
      }
      
      // Get the input schema for this handoff
      const agentKey = agent.name.toLowerCase().replace(/\s+/g, '_');
      const inputType = this.handoffInputTypes.get(agentKey);
      
      // Create the parameters schema
      let parameters: any = {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Optional reason for the handoff'
          }
        }
      };
      
      // If we have an input type, try to incorporate its schema
      if (inputType) {
        try {
          // For zod schemas, we need to extract properties differently
          // This is a simplified approach that works with basic schemas
          const schemaObject = inputType.safeParse({}).error?.format();
          if (schemaObject) {
            const additionalProps: Record<string, any> = {};
            Object.keys(schemaObject).forEach(key => {
              if (key !== '_errors') {
                additionalProps[key] = {
                  type: 'string',
                  description: `${key} for the handoff`
                };
              }
            });
            
            parameters.properties = {
              ...parameters.properties,
              ...additionalProps
            };
          }
        } catch (error) {
          console.error(`Error extracting schema from input type: ${error}`);
        }
      }
      
      return {
        type: 'function',
        function: {
          name: toolName,
          description: toolDescription,
          parameters
        }
      };
    });
    
    return [...tools, ...handoffTools];
  }

  /**
   * Set an input filter for a specific handoff target
   * @param targetAgentName Name of the target agent
   * @param filter Function to transform the input for the handoff
   */
  setHandoffInputFilter(targetAgentName: string, filter: HandoffInputFilter): void {
    const key = targetAgentName.toLowerCase().replace(/\s+/g, '_');
    this.handoffInputFilters.set(key, filter);
  }
} 