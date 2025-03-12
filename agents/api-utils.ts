import OpenAI from 'openai';
import { Tool, agentAsTool } from './tools';
import { Agent } from './agent';

// Initialize OpenAI client
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Whether to include sensitive data in traces, defaults to true unless configured otherwise
export const includeSensitiveData = process.env.OPENAI_AGENTS_DONT_LOG_TOOL_DATA !== '1';

/**
 * Interface for OpenAI API request parameters
 */
export interface OpenAIRequestParams {
  model: string;
  messages?: any[];
  instructions?: string;
  input?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tool_results?: any[];
  [key: string]: any;
}

/**
 * Prepare tools for the OpenAI API
 */
export function prepareToolsForAPI(tools: Tool[], includeHandoffs = true): any[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parametersSchema
    }
  }));
}

/**
 * Prepare parameters for a non-streaming OpenAI API call
 */
export function prepareCompletionParams(params: OpenAIRequestParams, tools?: any[]): any {
  const { model, messages, temperature, top_p, max_tokens, ...rest } = params;
  
  const requestParams: any = {
    model,
    messages,
    temperature: temperature ?? 0.7,
    top_p: top_p ?? 1,
    max_tokens,
    ...rest
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestParams.tools = tools;
    requestParams.tool_choice = 'auto';
  } else {
    requestParams.tool_choice = 'none';
  }

  return requestParams;
}

/**
 * Prepare parameters for a streaming OpenAI API call
 */
export function prepareStreamingParams(params: OpenAIRequestParams, tools?: any[]): any {
  const { 
    model, 
    instructions, 
    input, 
    temperature, 
    top_p, 
    max_tokens, 
    stream = true,
    tool_results,
    ...rest
  } = params;

  // Create the base parameters
  const requestParams: any = {
    model,
    // For OpenAI responses API we need to format instructions and input
    // differently than for chat completions
    instructions,
    input,
    temperature: temperature ?? 0.7,
    top_p: top_p ?? 1,
    max_tokens,
    stream,
    ...rest
  };

  // Add tools if provided and format them correctly
  if (tools && tools.length > 0) {
    requestParams.tools = tools;
    
    // Double check that all tools have the required format
    requestParams.tools = requestParams.tools.map((tool: any) => {
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

  // Add tool results if provided
  if (tool_results) {
    requestParams.tool_results = tool_results;
  }

  return requestParams;
}

/**
 * Call the OpenAI API for non-streaming completions
 */
export async function callOpenAI(params: any): Promise<any> {
  return await openaiClient.chat.completions.create(params);
}

/**
 * Call the OpenAI API for streaming completions
 */
export async function streamOpenAI(params: any): Promise<any> {
  return await openaiClient.responses.create(params);
} 