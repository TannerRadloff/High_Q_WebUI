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
      } else if (value instanceof z.ZodEnum) {
        baseSchema.properties[key] = { 
          type: 'string',
          enum: value._def.values
        };
        
        if (value._def.description) {
          baseSchema.properties[key].description = value._def.description;
        }
        
        // Check if it's optional
        const isOptional = value instanceof z.ZodOptional ||
                          Object.getPrototypeOf(value).constructor.name === 'ZodOptional';
        
        if (!isOptional) {
          baseSchema.required.push(key);
        }
      } else if (value instanceof z.ZodArray) {
        baseSchema.properties[key] = { 
          type: 'array',
          items: { type: 'string' } // Default to string items
        };
        
        if (value._def.description) {
          baseSchema.properties[key].description = value._def.description;
        }
        
        // Check if it's optional
        const isOptional = value instanceof z.ZodOptional ||
                          Object.getPrototypeOf(value).constructor.name === 'ZodOptional';
        
        if (!isOptional) {
          baseSchema.required.push(key);
        }
      }
      // Add other types as needed
    });
  }
  
  // If we have no required fields, omit the required property entirely
  if (baseSchema.required.length === 0) {
    delete baseSchema.required;
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
 * Updated to match OpenAI's parameter naming
 */
export const fileSearchTool = functionTool(
  'file_search',
  'Search through documents for relevant information',
  z.object({
    query: z.string().describe('The query to search for in the documents'),
    max_num_results: z.number().optional().describe('Maximum number of results to return'),
    vector_store_ids: z.array(z.string()).optional().describe('IDs of the vector stores to search in'),
  }),
  async (args) => {
    // In a real implementation, this would search through vector stores
    console.log(`Searching documents for: ${args.query}`);
    console.log(`Vector store IDs: ${args.vector_store_ids?.join(', ') || 'default'}`);
    const maxResults = args.max_num_results || 3;
    return `Retrieved ${maxResults} results for "${args.query}" from vector stores`;
  }
);

// Legacy name for backward compatibility
export const retrievalTool = fileSearchTool;

/**
 * Computer tool - similar to ComputerTool in the OpenAI Agent SDK
 * Allows agents to automate computer use tasks
 */
export const computerTool = functionTool(
  'computer',
  'Perform tasks on the computer such as file operations, browser automation, etc.',
  z.object({
    action: z.enum(['read_file', 'write_file', 'list_directory', 'execute_command', 'browser_action']).describe('The action to perform'),
    parameters: z.record(z.any()).describe('Parameters for the specified action'),
  }),
  async (args) => {
    console.log(`Computer action requested: ${args.action}`);
    console.log(`Parameters:`, args.parameters);
    
    // In a real implementation, this would perform the actual computer operation
    // through appropriate system APIs or libraries
    
    switch (args.action) {
      case 'read_file':
        return `Content of file ${args.parameters.path}: [simulated file content]`;
      case 'write_file':
        return `File ${args.parameters.path} written successfully`;
      case 'list_directory':
        return `Directory ${args.parameters.path} contents: [simulated directory listing]`;
      case 'execute_command':
        return `Command executed: ${args.parameters.command}\nOutput: [simulated command output]`;
      case 'browser_action':
        return `Browser action ${args.parameters.action} performed on ${args.parameters.url || 'current page'}`;
      default:
        return `Unknown action: ${args.action}`;
    }
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
  toolDescription: string,
  customSchema?: object
): Tool {
  // Create a schema based on custom input or use default
  const schema = customSchema || {
    type: "object",
    properties: {
      input: {
        type: "string",
        description: "The input to send to the agent"
      },
      context: {
        type: "object",
        description: "Optional context to provide to the agent",
        additionalProperties: true
      }
    },
    required: ["input"]
  };
  
  // Convert schema to Zod
  const paramsZod = z.object({
    input: z.string().describe("The input to send to the agent"),
    context: z.record(z.any()).optional().describe("Optional context to provide to the agent")
  });
  
  return {
    name: toolName,
    description: toolDescription,
    parameters: paramsZod,
    parametersSchema: schema,
    execute: async (args) => {
      try {
        // Destructure arguments
        const { input, context = {} } = args;
        
        // Add metadata to track tool usage
        context.calledAsTool = true;
        context.calledByTool = toolName;
        context.timestamp = new Date().toISOString();
        
        // Execute the agent
        const result = await agent.handleTask(input, context);
        
        // Format the result in a way that makes it clear it came from a sub-agent
        if (result.success) {
          // If we have structured output, ensure it's included in the JSON response
          if (result.structuredOutput) {
            return JSON.stringify({
              agentName: agent.name,
              content: result.content,
              structuredOutput: result.structuredOutput
            });
          }
          
          return result.content;
        } else {
          return `Error from ${agent.name}: ${result.error || 'Unknown error occurred'}`;
        }
      } catch (error) {
        console.error(`Error executing agent as tool (${toolName}):`, error);
        return `Error executing ${agent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  };
} 