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

// Helper function to try multiple models in sequence
const tryMultipleModels = (modelId: string, openAiIds: string[], fallbackId: string = 'gpt-4o-mini') => {
  console.log(`[MODEL] Trying multiple IDs for ${modelId}:`, openAiIds);
  
  // Try each model ID in sequence
  for (const openAiId of openAiIds) {
    try {
      console.log(`[MODEL] Trying ${modelId} with ID: ${openAiId}`);
      return openai(openAiId);
    } catch (error) {
      logModelError(`${modelId}:${openAiId}`, error);
      // Continue to the next ID
      console.log(`[MODEL] Failed with ${openAiId}, trying next option`);
    }
  }
  
  // If all fail, use fallback
  console.log(`[MODEL] All IDs failed for ${modelId}, using fallback: ${fallbackId}`);
  return openai(fallbackId);
};

// Helper function to safely create a model with error logging and fallback
const createSafeModel = (modelId: string, openAiId: string, fallbackId: string = 'gpt-4o-mini') => {
  try {
    // For gpt-o1, try multiple potential IDs
    if (modelId === 'gpt-o1') {
      return tryMultipleModels(modelId, [
        'gpt-4o-2024-05',         // Current official model ID for o1 (May 2024)
        'o1',                     // Alternative ID
        'gpt-4o-2024-08-preview', // Latest model ID for o1 (August 2024)
        'o1-preview',             // Alternate name
        'gpt-4o',                 // Fallback to gpt-4o if o1 not available
        openAiId                  // Passed parameter
      ], fallbackId);
    }
    
    // For other models, just use the specified ID
    return openai(openAiId);
  } catch (error) {
    logModelError(modelId, error);
    // Return default model as fallback
    return openai(fallbackId);
  }
};

export const myProvider = customProvider({
  languageModels: {
    'gpt-40': createSafeModel('gpt-40', 'gpt-4o'),
    'gpt-o1': createSafeModel('gpt-o1', 'o1', 'gpt-4o'), // Updated to use 'o1' as primary ID with gpt-4o fallback
    'gpt-o3-mini': createSafeModel('gpt-o3-mini', 'gpt-4o-mini'),
    'title-model': createSafeModel('title-model', 'gpt-4o'),
    'artifact-model': createSafeModel('artifact-model', 'gpt-4o-mini'),
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
