import OpenAI from 'openai';
import { Agent, AgentConfig, AgentContext, AgentResponse, StreamCallbacks } from './agent';
import { Tool, agentAsTool } from './tools';
import { generation_span, handoff_span } from './tracing';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
   * Handle tool calls from the OpenAI API response
   */
  async handleToolCalls(toolCalls: any[], context?: AgentContext, conversationHistory?: any[]): Promise<{ toolResults: any[], handoffResult?: AgentResponse }> {
    const toolResults = [];
    let handoffResult: AgentResponse | undefined;

    for (const toolCall of toolCalls) {
      const { function: func } = toolCall;
      const { name, arguments: argsJson } = func;

      // Check if it's a handoff tool
      if (name.startsWith('transfer_to_')) {
        const handoffName = name.replace('transfer_to_', '').replace(/_/g, ' ');
        const targetAgent = this.handoffs.find(
          agent => agent.name.toLowerCase().replace(/\s+/g, '_') === handoffName.toLowerCase()
        );

        if (targetAgent) {
          // Create a handoff span for tracing
          const handoffSpan = handoff_span(this.name, targetAgent.name, {
            source_agent: this.name,
            target_agent: targetAgent.name,
            reason: JSON.parse(argsJson || '{}').reason || 'No reason provided'
          });
          
          handoffSpan.enter();
          
          // Execute the actual handoff
          let handoffInput = '';
          
          // If we have conversation history, pass it to the new agent
          if (conversationHistory && conversationHistory.length > 0) {
            // The new agent receives the full conversation context
            handoffResult = await targetAgent.handleTask(
              // The last message in the conversation history is considered the current query
              conversationHistory[conversationHistory.length - 1].content, 
              { ...context, conversationHistory }
            );
          } else {
            // Fallback if no conversation history is provided
            const args = JSON.parse(argsJson || '{}');
            handoffInput = args.input || 'Handoff received with no specific input';
            handoffResult = await targetAgent.handleTask(handoffInput, context);
          }
          
          handoffSpan.exit();
          
          // Return a tool result for the handoff
          toolResults.push({
            tool_call_id: toolCall.id,
            output: `Handoff to ${targetAgent.name} completed. The agent has responded directly.`
          });
          
          // Since we've performed a handoff, we'll break here as control passes to the new agent
          break;
        } else {
          toolResults.push({
            tool_call_id: toolCall.id,
            output: `Error: Agent ${handoffName} not found for handoff`
          });
        }
      } else {
        // Handle regular tool calls
        const tool = this.tools.find(t => t.name === name);
        if (tool) {
          try {
            const args = JSON.parse(argsJson);
            const result = await tool.execute(args);
            toolResults.push({
              tool_call_id: toolCall.id,
              output: result
            });
          } catch (error) {
            toolResults.push({
              tool_call_id: toolCall.id,
              output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        } else {
          toolResults.push({
            tool_call_id: toolCall.id,
            output: `Error: Tool ${name} not found`
          });
        }
      }
    }

    return { toolResults, handoffResult };
  }

  /**
   * Handle a task with this agent
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      if (!userQuery || userQuery.trim() === '') {
        return {
          success: false,
          content: '',
          error: `Empty query provided. Please provide a valid query for ${this.name}.`
        };
      }

      const startTime = Date.now();
      const instructions = this.resolveInstructions(context);
      
      // Create a generation span for tracing
      const genSpan = generation_span(`${this.name} Generation`, {
        model: this.model,
        input: userQuery
      });
      
      genSpan.enter();
      
      // Prepare the API request
      const apiTools = this.prepareToolsForAPI();
      const hasTools = apiTools.length > 0;
      
      // Call OpenAI with appropriate parameters based on modelSettings
      const createParams: any = {
        model: this.model,
        instructions,
        input: userQuery,
      };
      
      // Add temperature if defined
      if (this.modelSettings?.temperature !== undefined) {
        createParams.temperature = this.modelSettings.temperature;
      }
      
      // Add top_p if defined
      if (this.modelSettings?.topP !== undefined) {
        createParams.top_p = this.modelSettings.topP;
      }
      
      // Add max tokens if defined - note that OpenAI API uses max_tokens
      if (this.modelSettings?.maxTokens !== undefined) {
        createParams.max_tokens = this.modelSettings.maxTokens;
      }
      
      // Add tools if we have any
      if (hasTools) {
        createParams.tools = apiTools;
        
        // Add debug logging
        console.log('Sending tools to OpenAI API:', JSON.stringify(apiTools, null, 2));
      }
      
      // Extract conversation history from context if available
      const conversationHistory = context?.conversationHistory || [];
      
      // Log full params for debugging
      console.log('Creating response with params:', JSON.stringify(createParams, null, 2));
      
      // Ensure tools format is correct for OpenAI API
      if (createParams.tools && createParams.tools.length > 0) {
        // Double check that all tools have the required format
        createParams.tools = createParams.tools.map((tool: any) => {
          // Make sure each tool has a 'type' field and a 'name' field
          if (!tool.type) {
            tool.type = 'function';
          }
          
          if (!tool.name) {
            console.error('Tool missing name field:', tool);
            // Try to get name from function.name if available
            if (tool.function && tool.function.name) {
              tool.name = tool.function.name;
            } else {
              tool.name = 'unnamed_tool';
            }
          }
          
          // Make sure the function property has the right structure
          if (tool.type === 'function' && (!tool.function || !tool.function.name)) {
            console.error('Tool missing required function fields:', tool);
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
      
      // Call OpenAI
      const response = await client.responses.create(createParams) as unknown as OpenAIResponse;
      
      let finalOutput = '';
      
      // Check for tool calls in the response
      if (response.tool_calls && response.tool_calls.length > 0) {
        const { toolResults, handoffResult } = await this.handleToolCalls(
          response.tool_calls, 
          context,
          [...conversationHistory, { role: 'user', content: userQuery }]
        );
        
        // If a handoff occurred, return its result instead
        if (handoffResult) {
          return handoffResult;
        }
        
        // Prepare follow-up params
        const followUpParams = { ...createParams, tool_results: toolResults };
        
        // Call the API again with the tool results
        const followUpResponse = await client.responses.create(followUpParams) as unknown as OpenAIResponse;
        
        finalOutput = followUpResponse.output_text;
      } else {
        finalOutput = response.output_text;
      }
      
      genSpan.exit();
      
      // Record completion time
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        content: finalOutput,
        metadata: {
          model: this.model,
          responseTime,
          query: userQuery,
          context,
          agent: this.name
        }
      };
    } catch (error) {
      console.error(`${this.name} error:`, error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
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
          if ('delta' in chunk) {
            if ('text' in chunk.delta) {
              const newContent = chunk.delta.text;
              callbacks.onToken?.(newContent);
              content += newContent;
            } else if ('tool_calls' in chunk.delta) {
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
                  if (call.function?.arguments) {
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