import { BaseAgent, Tool } from './agent-base';

// Define the code interpreter tool
const codeInterpreterTool: Tool = {
  type: 'function',
  name: 'code_interpreter',
  description: 'Execute code and return the result',
  execute: async (params: { code: string; language: string }) => {
    // In a real implementation, this would execute code in a sandbox
    // For now, we'll simulate code execution
    console.log(`Executing ${params.language} code: ${params.code}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock execution result
    return {
      result: `Simulated output of executing ${params.language} code. In a real implementation, this would be the actual output from running the code in a secure environment.`,
      success: true
    };
  }
};

/**
 * Coding Agent specialized in writing and explaining code
 */
export class CodingAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Coding Agent',
      instructions: `You are an expert coding assistant. Your goal is to help users with programming tasks, code explanations, and debugging.
      
When asked a coding question:
1. Understand the programming task or problem
2. Provide clear, well-commented code solutions
3. Explain your approach and why you chose it
4. If needed, use the code_interpreter tool to test your code
5. Provide explanations of how the code works

Focus on writing efficient, readable, and maintainable code. Use best practices for the programming language you're working with. If you're unsure about something, be honest about it.`,
      model: 'gpt-4',
      tools: [codeInterpreterTool]
    });
  }
} 