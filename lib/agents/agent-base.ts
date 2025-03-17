import OpenAI from 'openai';
import { OPENAI_API_KEY, getAgentSettings } from './config';

// Define the tool interface
export interface Tool {
  type: 'function';
  name: string;
  description: string;
  execute?: (params: any) => Promise<any>;
}

// Define the agent configuration interface
export interface AgentConfig {
  name: string;
  instructions: string;
  model?: string;
  tools?: Tool[];
  handoffs?: BaseAgent[];
}

// Define the agent response interface
export interface AgentResponse {
  content: string;
  agent: string;
  model?: string;
  toolResults?: any[];
  delegationReasoning?: string;
}

// Base agent class
export class BaseAgent {
  name: string;
  instructions: string;
  model: string;
  tools: Tool[];
  handoffs: BaseAgent[];
  openai: OpenAI;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    
    // Get model from config or use default from settings
    const settings = getAgentSettings(config.name);
    this.model = config.model || settings.model;
    
    this.tools = config.tools || [];
    this.handoffs = config.handoffs || [];
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  // Method to run the agent with a prompt
  async run(prompt: string, context?: any): Promise<AgentResponse> {
    try {
      // Prepare the messages for the OpenAI API
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.instructions
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      // If there are tools, format them for the API
      const tools: OpenAI.Chat.ChatCompletionTool[] | undefined = this.tools.length > 0 
        ? this.tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The user query to be processed'
                  }
                },
                required: ['query']
              }
            }
          })) 
        : undefined;

      // Call the OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: tools,
        tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
      });

      // Process the response
      const responseMessage = response.choices[0].message;
      
      // Check if the model wants to use a tool
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Handle tool calls
        const toolResults = await Promise.all(
          responseMessage.tool_calls.map(async (toolCall: OpenAI.Chat.ChatCompletionMessageToolCall) => {
            const tool = this.tools.find(t => t.name === toolCall.function.name);
            if (tool && tool.execute) {
              const params = JSON.parse(toolCall.function.arguments);
              return await tool.execute(params);
            }
            return null;
          })
        );

        // Add the tool results to the conversation and get a final response
        const finalResponse = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            ...messages,
            responseMessage,
            {
              role: 'tool',
              content: JSON.stringify(toolResults),
              tool_call_id: responseMessage.tool_calls[0].id
            }
          ]
        });

        return {
          content: finalResponse.choices[0].message.content || '',
          agent: this.name,
          model: this.model,
          toolResults
        };
      }

      // If no tool was used, return the direct response
      return {
        content: responseMessage.content || '',
        agent: this.name,
        model: this.model
      };
    } catch (error) {
      console.error(`Error running agent ${this.name}:`, error);
      throw error;
    }
  }

  // Method to check if this agent can handle a specific query
  async canHandle(query: string): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are ${this.name}. Your job is to determine if you can handle the following query based on your expertise and available tools. Respond with "yes" if you can handle it, or "no" if it would be better handled by another agent.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      const answer = response.choices[0].message.content?.toLowerCase().trim();
      return answer === 'yes';
    } catch (error) {
      console.error(`Error checking if agent ${this.name} can handle query:`, error);
      return false;
    }
  }
} 