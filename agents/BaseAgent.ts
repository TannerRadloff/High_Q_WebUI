import OpenAI from 'openai';
import { Agent, AgentConfig, AgentContext, AgentResponse, StreamCallbacks } from './agent';
import { Tool, agentAsTool } from './tools';
import { generation_span, handoff_span, agent_span, SpanType, TraceMetadata } from './tracing';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Whether to include sensitive data in traces, defaults to true unless configured otherwise
const includeSensitiveData = process.env.OPENAI_AGENTS_DONT_LOG_TOOL_DATA !== '1';

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
  handoffs: Agent[];
  outputType?: OutputType;

  constructor(config: AgentConfig<OutputType>) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.model = config.model || 'gpt-4o';
    this.modelSettings = config.modelSettings || { temperature: 0.7 };
    this.tools = config.tools || [];
    this.handoffs = config.handoffs || [];
    this.outputType = config.outputType;
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
   * Prepare tools for the OpenAI API
   */
  prepareToolsForAPI(): any[] {
    // Convert our tools to OpenAI's format
    const apiTools = this.tools.map(tool => ({
      type: 'function',
      name: tool.name,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersSchema
      }
    }));

    // Convert handoffs to tools
    const handoffTools = this.handoffs.map(agent => {
      const name = `transfer_to_${agent.name.toLowerCase().replace(/\s+/g, '_')}`;
      return {
        type: 'function',
        name: name,
        function: {
          name: name,
          description: `Transfer the conversation to the ${agent.name}`,
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Optional reason for the handoff'
              }
            },
            required: []
          }
        }
      };
    });
    
    // Log the tools before returning to help debug
    const allTools = [...apiTools, ...handoffTools];
    
    // Ensure every tool has the required fields according to OpenAI API
    for (const tool of allTools) {
      if (!tool.type) {
        console.error('Tool missing type field:', tool);
        tool.type = 'function'; // Set default type
      }
      
      if (!tool.name) {
        console.error('Tool missing name field:', tool);
        // If missing name, try to get it from function.name
        if (tool.function && tool.function.name) {
          tool.name = tool.function.name;
        } else {
          tool.name = 'unnamed_tool';
        }
      }
      
      if (!tool.function || !tool.function.name) {
        console.error('Tool missing function.name field:', tool);
        if (tool.function && !tool.function.name && tool.name) {
          // Copy the name from the tool to the function if missing
          tool.function.name = tool.name;
        }
      }
    }

    return allTools;
  }

  /**
   * Handle tool calls from the model response, including executing tools and handling handoffs
   */
  async handleToolCalls(toolCalls: any[], context?: AgentContext, conversationHistory?: any[]): Promise<{ toolResults: any[], handoffResult?: AgentResponse }> {
    const toolResults = [];
    let handoffResult: AgentResponse | undefined = undefined;

    for (const toolCall of toolCalls) {
      const { id, function: { name, arguments: argsStr } } = toolCall;
      
      try {
        // Check if this is a handoff tool call
        if (name.startsWith('transfer_to_')) {
          const targetAgentName = name.replace('transfer_to_', '').toLowerCase();
          
          // Find the target agent in handoffs
          const targetAgent = this.handoffs.find(agent => 
            agent.name.toLowerCase().replace(/\s+/g, '_') === targetAgentName
          );
          
          if (targetAgent) {
            // Parse arguments
            const handoffArgs = JSON.parse(argsStr);
            const reason = handoffArgs.reason || 'No reason provided';
            
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
              
              // Execute the handoff by calling the target agent's handleTask method
              const response = await targetAgent.handleTask(
                // If we have conversation history, we can be smarter about what we pass
                conversationHistory ? `I need your help with: ${conversationHistory[conversationHistory.length - 1].content}` : 
                // Otherwise just pass the original query from context if available
                context?.originalQuery || 'Please help with this task',
                handoffContext
              );
              
              // Return the result from the target agent
              handoffResult = response;
              
              // Add a tool result for the handoff
              toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: JSON.stringify({
                  status: 'success',
                  message: `Handoff to ${targetAgent.name} completed successfully`,
                  handoffId: uuidv4().substring(0, 8)
                })
              });
              
              // Exit the handoff span
              handoffSpanWrapper.exit();
              
              // In case of a handoff, we stop processing other tool calls
              break;
            } catch (error) {
              console.error(`Handoff to ${targetAgent.name} failed:`, error);
              handoffSpanWrapper.exit();
              
              toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: JSON.stringify({
                  status: 'error',
                  message: `Handoff to ${targetAgent.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
                status: 'error',
                message: `Target agent '${targetAgentName}' not found in available handoffs`
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
        console.error(`Error processing tool call:`, error);
        
        toolResults.push({
          tool_call_id: id,
          role: 'tool',
          name,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error during tool execution'}`
        });
      }
    }

    return { toolResults, handoffResult };
  }

  /**
   * Process a task through this agent
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    const agentContext = context || {};
    
    // Store the original query in context for potential handoffs
    if (!agentContext.originalQuery) {
      agentContext.originalQuery = userQuery;
    }
    
    // Create a trace span for this agent
    const agentSpanWrapper = agent_span(this.name, {
      agent_name: this.name,
      agent_instructions: typeof this.instructions === 'string' ? this.instructions : '[dynamic instructions]',
      input: includeSensitiveData ? userQuery : '[redacted]'
    });

    try {
      agentSpanWrapper.enter();
      
      // Initialize conversation history with the user's query
      const conversationHistory: any[] = [
        { role: 'system', content: this.resolveInstructions(agentContext) },
        { role: 'user', content: userQuery }
      ];
      
      // Prepare for the response
      let finalResponse: string = '';
      let metadata: Record<string, any> = {};
      let executionComplete = false;
      let maxTurns = 10; // Prevent infinite loops
      
      // Track tool calls for metadata
      const allToolCalls: any[] = [];
      
      while (!executionComplete && maxTurns > 0) {
        maxTurns--;
        
        try {
          // Create a span for the LLM call
          const generationSpanWrapper = generation_span('LLM Generation', {
            model: this.model,
            input: includeSensitiveData ? JSON.stringify(conversationHistory) : '[redacted]'
          });
          
          try {
            generationSpanWrapper.enter();
            
            // Call the OpenAI API
            const response = await client.chat.completions.create({
              model: this.model,
              messages: conversationHistory as any,
              temperature: this.modelSettings?.temperature || 0.7,
              top_p: this.modelSettings?.topP || 1,
              max_tokens: this.modelSettings?.maxTokens,
              tools: this.prepareToolsForAPI(),
              tool_choice: this.tools.length > 0 || this.handoffs.length > 0 ? 'auto' : 'none'
            });
            
            // Update the generation span with token usage if available
            if (response.usage) {
              generationSpanWrapper.addData({
                tokens: {
                  prompt_tokens: response.usage.prompt_tokens,
                  completion_tokens: response.usage.completion_tokens,
                  total_tokens: response.usage.total_tokens
                }
              });
            }
            
            // Get the response message
            const responseMessage = response.choices[0].message;
            
            // Add the assistant's message to conversation history
            conversationHistory.push({
              role: 'assistant',
              content: responseMessage.content || '',
              tool_calls: responseMessage.tool_calls
            });
            
            // Check if there are tool calls to process
            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
              // Add to tracking
              allToolCalls.push(...responseMessage.tool_calls);
              
              // Handle the tool calls
              const { toolResults, handoffResult } = await this.handleToolCalls(
                responseMessage.tool_calls,
                agentContext,
                conversationHistory
              );
              
              // If there was a handoff, we're done
              if (handoffResult) {
                // Add handoff result to metadata
                metadata = {
                  ...metadata,
                  handoffOccurred: true,
                  handoffTarget: handoffResult.metadata?.agentName || 'Unknown Agent',
                  handoffResult: handoffResult.metadata
                };
                
                // Return the result from the handoff target
                finalResponse = handoffResult.content;
                executionComplete = true;
                break;
              }
              
              // Add tool results to conversation history
              conversationHistory.push(...toolResults);
            } else {
              // No tool calls, so we're done
              finalResponse = responseMessage.content || '';
              executionComplete = true;
            }
            
            generationSpanWrapper.exit();
          } catch (error) {
            generationSpanWrapper.exit();
            throw error;
          }
        } catch (error) {
          console.error(`Error in agent execution:`, error);
          
          return {
            success: false,
            content: '',
            error: error instanceof Error ? error.message : 'Unknown error during agent execution'
          };
        }
      }
      
      // Check if we exited due to max turns
      if (!executionComplete) {
        return {
          success: false,
          content: '',
          error: 'Exceeded maximum number of interaction turns'
        };
      }
      
      // Add tool calls to metadata
      metadata = {
        ...metadata,
        toolCalls: allToolCalls
      };
      
      // Update the agent span with the output
      agentSpanWrapper.addData({
        output: includeSensitiveData ? finalResponse : '[redacted]'
      });
      
      agentSpanWrapper.exit();
      
      // Return the successful result
      return {
        success: true,
        content: finalResponse,
        metadata: {
          ...metadata,
          agentName: this.name,
          model: this.model,
          temperature: this.modelSettings?.temperature
        }
      };
    } catch (error) {
      agentSpanWrapper.exit();
      
      console.error(`Error in agent execution:`, error);
      
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error during agent execution'
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
      
      // Prepare the API request
      const apiTools = this.prepareToolsForAPI();
      const hasTools = apiTools.length > 0;
      
      // Prepare streaming parameters
      const streamParams: any = {
        model: this.model,
        instructions,
        input: userQuery,
        stream: true
      };
      
      // Add temperature if defined
      if (this.modelSettings?.temperature !== undefined) {
        streamParams.temperature = this.modelSettings.temperature;
      }
      
      // Add top_p if defined
      if (this.modelSettings?.topP !== undefined) {
        streamParams.top_p = this.modelSettings.topP;
      }
      
      // Add max tokens if defined
      if (this.modelSettings?.maxTokens !== undefined) {
        streamParams.max_tokens = this.modelSettings.maxTokens;
      }
      
      // Add tools if we have any
      if (hasTools) {
        streamParams.tools = apiTools;
        
        // Add debug logging
        console.log('Sending tools to OpenAI streaming API:', JSON.stringify(apiTools, null, 2));
      }
      
      // Extract conversation history from context if available
      const conversationHistory = context?.conversationHistory || [];
      
      // Log full params for debugging
      console.log('Creating streaming response with params:', JSON.stringify(streamParams, null, 2));
      
      // Ensure tools format is correct for OpenAI API
      if (streamParams.tools && streamParams.tools.length > 0) {
        // Double check that all tools have the required format
        streamParams.tools = streamParams.tools.map((tool: any) => {
          // Make sure each tool has a 'type' field and a 'name' field
          if (!tool.type) {
            tool.type = 'function';
          }
          
          if (!tool.name) {
            console.error('Tool missing name field for streaming:', tool);
            // Try to get name from function.name if available
            if (tool.function && tool.function.name) {
              tool.name = tool.function.name;
            } else {
              tool.name = 'unnamed_tool';
            }
          }
          
          // Make sure the function property has the right structure
          if (tool.type === 'function' && (!tool.function || !tool.function.name)) {
            console.error('Tool missing required function fields for streaming:', tool);
            // Try to fix it
            if (!tool.function) {
              tool.function = {
                name: tool.name || 'unnamed_function',
                description: 'No description provided',
                parameters: { type: 'object', properties: {} }
              };
            } else if (!tool.function.name) {
              tool.function.name = tool.name || 'unnamed_function';
            }
          }
          return tool;
        });
      }
      
      // Stream the response
      const stream = await client.responses.create(streamParams);
      
      let content = '';
      let toolCalls: any[] = [];
      let isCollectingToolCall = false;
      let currentToolCall: string = '';
      
      // Process the stream
      try {
        for await (const chunk of stream as any) {
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
            
            // Here we would stream the follow-up response with tool results
            // This is a simplified implementation
            const followUpResponse = await client.responses.create({
              ...streamParams,
              tool_results: toolResults,
              stream: false
            }) as unknown as OpenAIResponse;
            
            callbacks.onToken?.(followUpResponse.output_text);
            content += followUpResponse.output_text;
          }
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
   * Converts this agent to a tool that can be used by other agents
   */
  asTool(toolName: string, toolDescription: string): Tool {
    return agentAsTool(this, toolName, toolDescription);
  }
} 