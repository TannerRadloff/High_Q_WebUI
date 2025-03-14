import { OpenAI } from 'openai';

// Helper to detect server environment
function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

// Initialize the OpenAI client with proper validation
let openaiClient: OpenAI | null = null;

// Only initialize the client on the server side
if (isServerEnvironment()) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  try {
    if (apiKey) {
      openaiClient = new OpenAI({ apiKey });
      console.log('OpenAI client initialized successfully');
    } else {
      console.warn('OpenAI client not initialized due to missing API key');
    }
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
  }
} else {
  console.log('Skipping OpenAI client initialization on client side');
}

// Export the client
export { openaiClient };

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

// Define model mapping for OpenAI models
export const modelMapping = {
  'gpt-40': 'gpt-4o',
  'gpt-o1': 'gpt-4o', // Use gpt-4o as a fallback if o1 is not available
  'gpt-o3-mini': 'gpt-4o-mini',
  'title-model': 'gpt-4o',
  'artifact-model': 'gpt-4o-mini',
};

// Define image model mapping
export const imageModelMapping = {
  'small-model': 'dall-e-2',
  'large-model': 'dall-e-3',
};

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

// Helper function to get the actual OpenAI model name from our internal model ID
export const getOpenAIModelName = (modelId: string): string => {
  return modelMapping[modelId as keyof typeof modelMapping] || 'gpt-4o-mini';
};

// Create a direct OpenAI client for use with the Responses API
// This provides a way to access the Responses API directly when needed
export const openaiResponses = {
  create: async (input: string, options: { model?: string, tools?: any[] } = {}) => {
    try {
      // Check if OpenAI client is available
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please provide a valid OPENAI_API_KEY in your environment variables.');
      }
      
      const modelId = options.model || DEFAULT_CHAT_MODEL;
      const model = getOpenAIModelName(modelId);
      console.log(`[Responses API] Creating response with model: ${model} (from ${modelId})`);
      
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
      
      const modelId = options.model || DEFAULT_CHAT_MODEL;
      const model = getOpenAIModelName(modelId);
      console.log(`[Responses API] Creating streaming response with model: ${model} (from ${modelId})`);
      
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
  },
  
  // Add a method for generating images using DALL-E models
  createImage: async (prompt: string, options: { 
    model?: string, 
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792', 
    quality?: 'standard' | 'hd', 
    n?: number 
  } = {}) => {
    try {
      // Check if OpenAI client is available
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please provide a valid OPENAI_API_KEY in your environment variables.');
      }
      
      const modelId = options.model || 'large-model';
      const model = imageModelMapping[modelId as keyof typeof imageModelMapping] || 'dall-e-3';
      console.log(`[Image API] Creating image with model: ${model} (from ${modelId})`);
      
      return await openaiClient.images.generate({
        model,
        prompt,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        n: options.n || 1,
      });
    } catch (error) {
      logModelError(options.model || 'unknown', error);
      
      // If OpenAI client is missing, don't attempt to fallback
      if (!openaiClient) {
        throw error;
      }
      
      console.log(`[Image API] Falling back to dall-e-2`);
      return await openaiClient.images.generate({
        model: 'dall-e-2',
        prompt,
        size: '1024x1024',
        n: 1,
      });
    }
  }
};
