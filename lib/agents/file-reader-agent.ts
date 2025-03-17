import { BaseAgent, AgentConfig } from './agent-base';
import { z } from 'zod';
import OpenAI from 'openai';

const FileReaderInput = z.object({
  file: z.any(), // Will be a File object from the browser
  fileType: z.enum(['excel', 'csv', 'text']),
});

type FileReaderInput = z.infer<typeof FileReaderInput>;

export class FileReaderAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'File Reader Agent',
      instructions: `You are a file reading agent specialized in processing patent claim documents.
Your task is to extract patent claims from the provided file and output them as a structured list.
Each claim should be properly formatted and numbered for further analysis.`,
      tools: [] // No tools needed for file reading
    };
    super(config);
  }

  async processFile(input: FileReaderInput): Promise<string[]> {
    // Validate input
    FileReaderInput.parse(input);

    // Create chat completion request
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: this.instructions
        },
        {
          role: 'user',
          content: `Process the following patent claims and output them as a numbered list:\n${input.file}`
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    // Parse the response into an array of claims
    return content.split('\n').filter((claim: string) => claim.trim().length > 0);
  }
} 