import { OpenAI } from 'openai';

// Check if OpenAI API key is available
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY environment variable is missing or empty. Please set it in your .env.local file.');
}

// Initialize the OpenAI client with proper validation
export const openaiClient = apiKey 
  ? new OpenAI({ apiKey })
  : null; // Will be null if API key is missing

export const DEFAULT_CHAT_MODEL: string = 'gpt-o3-mini';

// Custom error logger for model issues
const logModelError = (modelId: string, error: any) => {
  console.error(`[MODEL ERROR] Error with model ${modelId}:`, error);
  console.error(`Model error details:`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
  });
};

// Create a simplified OpenAI provider using the standard AI SDK format
// This uses OpenAI's chat completions API under the hood
import { openai } from '@ai-sdk/openai';

export const myProvider = customProvider({
  languageModels: {
    'gpt-40': openai('gpt-4o'),
    'gpt-o1': openai('gpt-4o'), // Use gpt-4o as a fallback if o1 is not available
    'gpt-o3-mini': openai('gpt-4o-mini'),
    'title-model': openai('gpt-4o'),
    'artifact-model': openai('gpt-4o-mini'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gpt-40',
    name: 'GPT 4o',
    description: 'Powerful multimodal model for complex tasks',
  },
  {
    id: 'gpt-o1',
    name: 'GPT o1',
    description: 'High-performance model with advanced reasoning',
  },
  {
    id: 'gpt-o3-mini',
    name: 'GPT o3 mini',
    description: 'Fast, efficient model for everyday tasks',
  },
];

// Create a direct OpenAI client for use with the Responses API
// This provides a way to access the Responses API directly when needed
export const openaiResponses = {
  create: async (input: string, options: { model?: string, tools?: any[] } = {}) => {
    try {
      // Check if OpenAI client is available
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please provide a valid OPENAI_API_KEY in your environment variables.');
      }
      
      const model = options.model || 'gpt-4o-mini';
      console.log(`[Responses API] Creating response with model: ${model}`);
      
      return await openaiClient.responses.create({
        model,
        input,
        tools: options.tools,
      });
    } catch (error) {
      logModelError(options.model || 'unknown', error);
      
      // If OpenAI client is missing, don't attempt to fallback
      if (!openaiClient) {
        throw error;
      }
      
      console.log(`[Responses API] Falling back to gpt-4o-mini`);
      return await openaiClient.responses.create({
        model: 'gpt-4o-mini',
        input,
      });
    }
  },
  
  createStream: async (input: string, options: { model?: string, tools?: any[] } = {}) => {
    try {
      // Check if OpenAI client is available
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please provide a valid OPENAI_API_KEY in your environment variables.');
      }
      
      const model = options.model || 'gpt-4o-mini';
      console.log(`[Responses API] Creating streaming response with model: ${model}`);
      
      return await openaiClient.responses.create({
        model,
        input,
        tools: options.tools,
        stream: true,
      });
    } catch (error) {
      logModelError(options.model || 'unknown', error);
      
      // If OpenAI client is missing, don't attempt to fallback
      if (!openaiClient) {
        throw error;
      }
      
      console.log(`[Responses API] Falling back to gpt-4o-mini for streaming`);
      return await openaiClient.responses.create({
        model: 'gpt-4o-mini',
        input,
        stream: true,
      });
    }
  }
};
