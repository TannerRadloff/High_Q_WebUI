import { openai } from '@ai-sdk/openai';
import {
  customProvider,
} from 'ai';

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

// Helper function to create a model with proper error handling
const createModel = (modelId: string) => {
  try {
    console.log(`[MODEL] Creating model: ${modelId}`);
    return openai(modelId);
  } catch (error) {
    logModelError(modelId, error);
    console.log(`[MODEL] Falling back to gpt-4o-mini for ${modelId}`);
    return openai('gpt-4o-mini');
  }
};

export const myProvider = customProvider({
  languageModels: {
    'gpt-40': createModel('gpt-4o'),
    'gpt-o1': createModel('gpt-4o'), // Use gpt-4o as a fallback if o1 is not available
    'gpt-o3-mini': createModel('gpt-4o-mini'),
    'title-model': createModel('gpt-4o'),
    'artifact-model': createModel('gpt-4o-mini'),
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
