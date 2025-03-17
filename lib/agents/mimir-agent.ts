import { BaseAgent, Tool } from './agent-base';
import { ResearchAgent } from './research-agent';
import { CodingAgent } from './coding-agent';
import { DataAnalysisAgent } from './data-analysis-agent';
import { WritingAgent } from './writing-agent';
import OpenAI from 'openai';

// Define model constants
const HIGH_QUALITY_MODEL = 'gpt-4';
const COST_EFFICIENT_MODEL = 'gpt-3.5-turbo';

// Define system instructions
const MIMIR_INSTRUCTION = `You are Mimir, an AI assistant with the ability to delegate tasks to specialist agents. 
If a question requires specific expertise or a multi-step solution, you should delegate to the appropriate specialist agent.
Otherwise, answer directly with your knowledge.

Your available specialist agents are:
1. Research Agent - Expert at finding information on any topic, providing advice on complex decisions, and answering questions that require up-to-date information
2. Coding Agent - Expert at writing and explaining code
3. Data Analysis Agent - Expert at analyzing and visualizing data
4. Writing Agent - Expert at creating and improving text content

When deciding whether to delegate:
- For factual questions, research needs, advice on complex decisions (like buying a car or house), or information gathering, use the Research Agent
- For code writing, debugging, or programming explanations, use the Coding Agent
- For data analysis, statistics, or visualization tasks, use the Data Analysis Agent
- For content creation, editing, or writing assistance, use the Writing Agent

Always prioritize giving the user the most helpful and accurate response. If a query spans multiple domains, choose the agent that covers the primary need.`;

/**
 * Mimir Agent - the main triage agent that can delegate to specialized agents
 */
export class MimirAgent extends BaseAgent {
  researchAgent: ResearchAgent;
  codingAgent: CodingAgent;
  dataAnalysisAgent: DataAnalysisAgent;
  writingAgent: WritingAgent;

  constructor() {
    // Initialize specialized agents
    const researchAgent = new ResearchAgent();
    const codingAgent = new CodingAgent();
    const dataAnalysisAgent = new DataAnalysisAgent();
    const writingAgent = new WritingAgent();

    // Define function tools for orchestration
    const orchestrationTools: Tool[] = [
      {
        type: 'function',
        name: 'research_task',
        description: 'Use this function when the user query requires research, information gathering, answering factual questions, or providing advice on complex decisions (like buying a car, choosing a house, making investment decisions, etc.).',
        execute: async (params: { query: string }) => {
          return await researchAgent.run(params.query);
        }
      },
      {
        type: 'function',
        name: 'coding_task',
        description: 'Use this function when the user query involves writing code, debugging, or explaining programming concepts.',
        execute: async (params: { query: string }) => {
          return await codingAgent.run(params.query);
        }
      },
      {
        type: 'function',
        name: 'data_analysis_task',
        description: 'Use this function when the user query involves analyzing data, statistics, or creating visualizations.',
        execute: async (params: { query: string }) => {
          return await dataAnalysisAgent.run(params.query);
        }
      },
      {
        type: 'function',
        name: 'writing_task',
        description: 'Use this function when the user query involves writing, editing, or improving text content.',
        execute: async (params: { query: string }) => {
          return await writingAgent.run(params.query);
        }
      }
    ];

    super({
      name: 'Mimir (Triage Agent)',
      instructions: MIMIR_INSTRUCTION,
      model: HIGH_QUALITY_MODEL,
      handoffs: [researchAgent, codingAgent, dataAnalysisAgent, writingAgent],
      tools: orchestrationTools
    });

    // Store references to the specialized agents
    this.researchAgent = researchAgent;
    this.codingAgent = codingAgent;
    this.dataAnalysisAgent = dataAnalysisAgent;
    this.writingAgent = writingAgent;
  }

  /**
   * Override the run method to implement manual orchestration using OpenAI's Chat/Functions API
   */
  async run(prompt: string, context?: any): Promise<any> {
    try {
      // First, check if this is a simple query that can be answered directly
      if (this.isSimpleQuery(prompt)) {
        return await this.directAnswerPath(prompt, context);
      }
      
      // For more complex queries, use the task planning path with function calling
      return await this.taskPlanningPath(prompt, context);
    } catch (error) {
      console.error('Error in Mimir agent orchestration:', error);
      // Fall back to direct handling
      return await super.run(prompt, context);
    }
  }

  /**
   * Direct answer path for simple queries
   * Uses OpenAI's Chat Completion API with Mimir's persona
   */
  private async directAnswerPath(prompt: string, context?: any): Promise<any> {
    // Prepare the messages for the OpenAI API
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: MIMIR_INSTRUCTION
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Use cost-efficient model for simple queries
    const response = await this.openai.chat.completions.create({
      model: COST_EFFICIENT_MODEL,
      messages,
      temperature: 0.7,
    });

    // Return the direct response
    return {
      content: response.choices[0].message.content,
      agent: this.name,
      model: COST_EFFICIENT_MODEL
    };
  }

  /**
   * Task planning path for complex queries
   * Uses OpenAI's function calling feature to delegate to specialized agents
   */
  private async taskPlanningPath(prompt: string, context?: any): Promise<any> {
    // Prepare the messages for the OpenAI API
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${MIMIR_INSTRUCTION}

For complex queries, you should determine which specialized agent would be best suited to handle it.
You have access to the following functions:
- research_task: For queries requiring research or factual information
- coding_task: For queries involving code or programming
- data_analysis_task: For queries involving data analysis or visualization
- writing_task: For queries involving writing or content creation

If you can handle the query directly, do so. Otherwise, call the appropriate function.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Format tools for the API
    const tools: OpenAI.Chat.ChatCompletionTool[] = this.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The user query to be processed by the specialized agent'
            }
          },
          required: ['query']
        }
      }
    }));

    // Use high-quality model for complex queries with function calling
    const response = await this.openai.chat.completions.create({
      model: HIGH_QUALITY_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    // Check if the model wants to use a tool (delegate to a specialized agent)
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Get the tool call
      const toolCall = responseMessage.tool_calls[0];
      const toolName = toolCall.function.name;
      const tool = this.tools.find(t => t.name === toolName);
      
      if (tool && tool.execute) {
        // Parse the arguments
        const params = JSON.parse(toolCall.function.arguments);
        
        // Execute the tool (delegate to specialized agent)
        const result = await tool.execute(params);
        
        // Get the reasoning for delegation
        const delegationReasoning = await this.getDelegationReasoning(toolName, prompt);
        
        // Return the result with delegation info
        return {
          ...result,
          delegationReasoning,
          model: HIGH_QUALITY_MODEL
        };
      }
    }

    // If no tool was used, return the direct response
    return {
      content: responseMessage.content,
      agent: this.name,
      model: HIGH_QUALITY_MODEL
    };
  }

  /**
   * Rule-based method to determine if a query is simple enough for direct answering
   */
  private isSimpleQuery(prompt: string): boolean {
    const prompt_lower = prompt.toLowerCase();
    
    // Simple greeting or short question (less than 10 words)
    if (prompt.split(' ').length < 10) {
      return true;
    }
    
    // Check for keywords that might indicate a complex query
    const complexKeywords = [
      'code', 'program', 'develop', 'build', 'create', 'implement',
      'research', 'find', 'search', 'analyze', 'data', 'statistics',
      'write', 'essay', 'article', 'content', 'blog', 'report',
      'complex', 'difficult', 'challenging', 'step by step', 'workflow',
      'advice', 'recommend', 'suggestion', 'buy', 'purchase', 'invest',
      'decision', 'compare', 'difference', 'better', 'best', 'worst',
      'should i', 'how do i', 'what should', 'help me'
    ];
    
    // If any complex keywords are found, it's likely not a simple query
    return !complexKeywords.some(keyword => prompt_lower.includes(keyword));
  }

  /**
   * Get the reasoning for delegating to a specialized agent
   */
  private async getDelegationReasoning(toolName: string, prompt: string): Promise<string> {
    const agentName = this.getAgentNameFromToolName(toolName);
    
    const reasoningResponse = await this.openai.chat.completions.create({
      model: COST_EFFICIENT_MODEL, // Use cost-efficient model for reasoning
      messages: [
        {
          role: 'system',
          content: `You are Mimir, the chief AI. You've decided to delegate the user's query to the ${agentName} Agent. Briefly explain why this agent is best suited for this query in 1-2 sentences.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    return reasoningResponse.choices[0].message.content || '';
  }

  /**
   * Helper method to get the agent name from the tool name
   */
  private getAgentNameFromToolName(toolName: string): string {
    switch (toolName) {
      case 'research_task':
        return 'Research';
      case 'coding_task':
        return 'Coding';
      case 'data_analysis_task':
        return 'Data Analysis';
      case 'writing_task':
        return 'Writing';
      default:
        return 'Mimir';
    }
  }
} 