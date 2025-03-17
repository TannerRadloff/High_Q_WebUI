import { z } from 'zod';
import { AgentContext } from './agent';
import { BaseAgent } from './BaseAgent';
import { functionTool, webSearchTool } from './tools';
import { ReportAgent } from './ReportAgent';
import { promptWithHandoffInstructions } from './handoff';

/**
 * A specialized agent that performs research on user queries
 * Follows OpenAI Agent SDK patterns
 */
export class ResearchAgent extends BaseAgent {
  constructor() {
    // Create the ReportAgent for handoff
    const reportAgent = new ReportAgent();

    super({
      name: 'ResearchAgent',
      instructions: promptWithHandoffInstructions(`You are a specialized research agent that handles tasks requiring investigation, information gathering, and providing factual answers.

      Your capabilities include:
      - Answering factual questions with precise, accurate information 
      - Finding current information on topics the user is interested in
      - Providing explanations for complex concepts
      
      If the original request appears to require a formal report format after your research is complete, use the transfer_to_reportagent function to hand off your research findings to the ReportAgent which can format them appropriately. You should do this when:
      - The user explicitly asks for a report or formal document
      - The information would benefit from structured formatting like tables, headers, or sections
      - The answer is comprehensive enough that organization would improve readability
      
      Provide thorough, factual responses and include citations whenever possible to support your information.`),
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.7,
      },
      tools: [
        // Web search tool for finding information
        webSearchTool,
        
        // Tool for counting citations in the response
        functionTool(
          'count_citations',
          'Count the number of citations in the text',
          z.object({
            text: z.string().describe('The text to analyze for citations')
          }),
          async (args) => {
            const citationCount = this.countCitations(args.text);
            return JSON.stringify({ citationCount });
          }
        ),
        
        // Tool for checking source quality
        functionTool(
          'verify_sources',
          'Verify if sources are credible and diverse',
          z.object({
            sources: z.array(z.string()).describe('List of sources to verify')
          }),
          async (args) => {
            // This would be a more complex implementation in a real system
            const sourceDiversity = args.sources.length > 1 ? 'diverse' : 'limited';
            return JSON.stringify({ 
              diversity: sourceDiversity,
              credibilityCheck: 'completed'
            });
          }
        ),
        
        // Tool to check if content should be formatted as a report
        functionTool(
          'should_format_as_report',
          'Determine if the research content should be handed off to the ReportAgent',
          z.object({
            query: z.string().describe('The original user query'),
            researchContent: z.string().describe('The research content to evaluate')
          }),
          async (args) => {
            // This is a placeholder implementation - in reality, this would have more complex logic
            // to determine whether the content should be formatted as a report
            const needsReport = args.query.toLowerCase().includes('report') || 
                              args.query.toLowerCase().includes('essay') ||
                              args.query.toLowerCase().includes('article') ||
                              args.researchContent.length > 2000;
            
            return JSON.stringify({ 
              needsReport,
              reason: needsReport ? 
                'The query requests a formal report format or the research is extensive enough to benefit from structured formatting' : 
                'The research is concise and does not require formal report formatting'
            });
          }
        )
      ],
      // Add handoff to ReportAgent
      handoffs: [reportAgent]
    });
  }

  /**
   * Override handleTask to add citation counting
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<{
    success: boolean;
    content: string;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    // Call the parent handleTask method
    const response = await super.handleTask(userQuery, context);
    
    // If a handoff occurred, the response will contain the result from the target agent
    // so we can just return it directly
    if (response.metadata?.handoffOccurred) {
      return response;
    }
    
    if (response.success) {
      // Count citations in the final output
      const citationCount = this.countCitations(response.content);
      
      // Add citation count to metadata
      return {
        ...response,
        metadata: {
          ...response.metadata,
          citationCount
        }
      };
    }
    
    return response;
  }
} 