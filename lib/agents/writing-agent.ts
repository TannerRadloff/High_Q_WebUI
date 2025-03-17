import { BaseAgent, Tool } from './agent-base';

// Define the grammar check tool
const grammarCheckTool: Tool = {
  type: 'function',
  name: 'grammar_check',
  description: 'Check text for grammar and spelling errors',
  execute: async (params: { text: string }) => {
    // In a real implementation, this would use a grammar checking API
    // For now, we'll simulate grammar checking
    console.log(`Checking grammar for: ${params.text.substring(0, 50)}...`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return mock grammar check results
    return {
      corrected_text: params.text, // In a real implementation, this would contain corrections
      suggestions: [
        {
          original: "example error",
          suggestion: "corrected example",
          explanation: "This is a simulated grammar correction"
        }
      ],
      score: 95 // Simulated grammar score out of 100
    };
  }
};

// Define the text improvement tool
const textImprovementTool: Tool = {
  type: 'function',
  name: 'improve_text',
  description: 'Suggest improvements for clarity, conciseness, and engagement',
  execute: async (params: { text: string; goal: string }) => {
    // In a real implementation, this would use an AI to improve text
    // For now, we'll simulate text improvement
    console.log(`Improving text with goal: ${params.goal}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock improvement results
    return {
      improved_text: params.text, // In a real implementation, this would contain improved text
      changes: [
        {
          original: "example text",
          improved: "better example text",
          reason: "This is a simulated text improvement"
        }
      ],
      suggestions: [
        "Simulated suggestion for further improvement"
      ]
    };
  }
};

/**
 * Writing Agent specialized in creating and improving written content
 */
export class WritingAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Writing Agent',
      instructions: `You are an expert writing assistant. Your goal is to help users create high-quality written content and improve existing text.
      
When asked to write or edit content:
1. Understand the user's goals and target audience
2. Create clear, engaging, and well-structured content
3. Use the grammar_check tool to ensure correctness
4. Use the improve_text tool to enhance clarity, conciseness, and engagement
5. Adapt your style to match the appropriate tone and format for the content type

Focus on creating content that is clear, engaging, and effective. Consider the purpose of the content and the needs of the audience. If you're unsure about something, ask for clarification.`,
      model: 'gpt-4',
      tools: [grammarCheckTool, textImprovementTool]
    });
  }
} 