import { z } from 'zod';

/**
 * Represents a tool that agents can use to perform specific functions.
 * Similar to the FunctionTool in OpenAI Agent SDK.
 */
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any, any>;
  parametersSchema: object; // JSON Schema representation
  execute: (args: any) => Promise<string>;
}

/**
 * Base interface for tool arguments
 */
export interface ToolArgs {
  [key: string]: any;
}

/**
 * Creates a function tool from a function with type information
 * Similar to @function_tool decorator in the OpenAI Agent SDK
 */
export function functionTool<T extends ToolArgs>(
  name: string,
  description: string,
  parameters: z.ZodType<T>,
  execute: (args: T) => Promise<string>
): Tool {
  return {
    name,
    description,
    parameters,
    parametersSchema: zodToJsonSchema(parameters),
    execute,
  };
}

/**
 * Convert a Zod schema to JSON Schema
 */
function zodToJsonSchema(schema: z.ZodType<any, any>): object {
  // This is a simplified conversion
  // In a real implementation, you would use a library like zod-to-json-schema
  const baseSchema: any = { type: 'object', properties: {}, required: [] };
  
  if (schema instanceof z.ZodObject) {
    const shape = (schema as any)._def.shape();
    
    Object.entries(shape).forEach(([key, value]: [string, any]) => {
      if (value instanceof z.ZodString) {
        baseSchema.properties[key] = { type: 'string' };
        
        // Check if there's a description
        if (value._def.description) {
          baseSchema.properties[key].description = value._def.description;
        }
        
        // Check if it's optional by looking for the ZodOptional wrapper
        const isOptional = value instanceof z.ZodOptional ||
                          Object.getPrototypeOf(value).constructor.name === 'ZodOptional';
        
        if (!isOptional) {
          baseSchema.required.push(key);
        }
      } else if (value instanceof z.ZodNumber) {
        baseSchema.properties[key] = { type: 'number' };
        
        if (value._def.description) {
          baseSchema.properties[key].description = value._def.description;
        }
        
        // Check if it's optional by looking for the ZodOptional wrapper
        const isOptional = value instanceof z.ZodOptional ||
                          Object.getPrototypeOf(value).constructor.name === 'ZodOptional';
        
        if (!isOptional) {
          baseSchema.required.push(key);
        }
      }
      // Add other types as needed
    });
  }
  
  return baseSchema;
}

/**
 * Web search tool - similar to WebSearchTool in the OpenAI Agent SDK
 */
export const webSearchTool = functionTool(
  'web_search',
  'Search the web for current information',
  z.object({
    query: z.string().describe('The search query to run'),
  }),
  async (args) => {
    // In a real implementation, this would call an actual search API
    console.log(`Searching web for: ${args.query}`);
    return `Web search results for "${args.query}"`;
  }
);

/**
 * Retrieval tool - similar to FileSearchTool in the OpenAI Agent SDK
 */
export const retrievalTool = functionTool(
  'retrieval',
  'Search through documents for relevant information',
  z.object({
    query: z.string().describe('The query to search for in the documents'),
    max_results: z.number().optional().describe('Maximum number of results to return'),
  }),
  async (args) => {
    // In a real implementation, this would search through a vector store
    console.log(`Searching documents for: ${args.query}`);
    const maxResults = args.max_results || 3;
    return `Retrieved ${maxResults} results for "${args.query}"`;
  }
);

/**
 * Formats a tool's parameters as a JSON schema
 * Similar to params_json_schema in the SDK
 */
export function getParametersAsJsonSchema(tool: Tool): object {
  return tool.parametersSchema;
}

/**
 * Default error handler for tool execution
 */
export async function defaultToolErrorFunction(error: Error): Promise<string> {
  return `Error executing tool: ${error.message}`;
}

/**
 * Agent as tool - allows using an agent as a tool
 * Similar to agent.as_tool in the SDK
 */
export function agentAsTool(
  agent: any, // Using any since we'll define Agent interface later
  toolName: string,
  toolDescription: string
): Tool {
  return {
    name: toolName,
    description: toolDescription,
    parameters: z.object({
      input: z.string().describe('The input to send to the agent'),
    }),
    parametersSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "The input to send to the agent"
        }
      },
      required: ["input"]
    },
    execute: async (args) => {
      const result = await agent.handleTask(args.input);
      return result.content;
    },
  };
} 