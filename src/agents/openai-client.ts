/**
 * OpenAI client wrapper for agent execution
 */
import OpenAI from 'openai';

// Initialize the OpenAI client
const apiKey = process.env.OPENAI_API_KEY || '';
const openai = new OpenAI({ apiKey });

// Create a wrapper with our custom methods
export const aiClient = {
  /**
   * Creates a completion for the provided input
   */
  async createCompletion(input: string, options: any) {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: input }],
      model: options.model || 'gpt-4-turbo',
      tools: options.tools || [],
      temperature: options.temperature || 0.7,
    });

    return {
      output_text: response.choices[0]?.message?.content || ''
    };
  },

  /**
   * Creates a streaming completion
   */
  async streamCompletion(input: string, options: any) {
    const stream = await openai.chat.completions.create({
      messages: [{ role: 'user', content: input }],
      model: options.model || 'gpt-4-turbo',
      tools: options.tools || [],
      temperature: options.temperature || 0.7,
      stream: true,
    });

    return stream;
  }
}; 