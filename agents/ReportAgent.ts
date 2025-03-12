import { z } from 'zod';
import { AgentContext } from './agent';
import { BaseAgent } from './BaseAgent';
import { functionTool } from './tools';

/**
 * A specialized agent that formats and structures information into reports
 * Follows OpenAI Agent SDK patterns
 */
export class ReportAgent extends BaseAgent {
  constructor() {
    super({
      name: 'ReportAgent',
      instructions: `You are a professional report writer who creates clear, well-structured reports based on provided information.

      When generating a report:
      1. Organize information logically with headings and subheadings
      2. Include an executive summary if appropriate
      3. Maintain appropriate tone (formal, analytical)
      4. Preserve all citation references in the original format
      5. Format content for clarity and readability
      
      The report should be comprehensive but concise, focusing on key findings and insights.`,
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.5, // Slightly lower temperature for more consistent formatting
      },
      tools: [
        // Tool for analyzing report structure
        functionTool(
          'analyze_structure',
          'Analyze the structure of a report',
          z.object({
            text: z.string().describe('The report text to analyze')
          }),
          async (args) => {
            // This would be a more complex implementation in a real system
            const headingCount = countHeadings(args.text);
            const paragraphCount = countParagraphs(args.text);
            
            return JSON.stringify({
              headings: headingCount,
              paragraphs: paragraphCount,
              hasExecutiveSummary: args.text.toLowerCase().includes('executive summary') || 
                                  args.text.toLowerCase().includes('summary'),
              hasCitations: /\[\d+\]/.test(args.text)
            });
          }
        ),
        
        // Tool for formatting text in markdown
        functionTool(
          'format_markdown',
          'Format text as markdown with proper headings and structure',
          z.object({
            text: z.string().describe('The text to format'),
            format: z.enum(['academic', 'business', 'technical']).describe('The style of formatting to apply')
          }),
          async (args) => {
            // This would apply different formatting templates in a real implementation
            return `Formatted the text in ${args.format} style`;
          }
        )
      ]
    });
  }

  /**
   * Override handleTask to add report analysis
   */
  async handleTask(userQuery: string, context?: AgentContext): Promise<{
    success: boolean;
    content: string;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    // Call the parent handleTask method
    const response = await super.handleTask(userQuery, context);
    
    if (response.success) {
      // Analyze the report structure
      const structureAnalysis = {
        headings: countHeadings(response.content),
        paragraphs: countParagraphs(response.content),
        wordCount: countWords(response.content)
      };
      
      // Add structure analysis to metadata
      return {
        ...response,
        metadata: {
          ...response.metadata,
          structureAnalysis
        }
      };
    }
    
    return response;
  }
}

/**
 * Helper function to count headings in markdown text
 */
function countHeadings(text: string): number {
  const headingPattern = /^#{1,6}\s+.+$/gm;
  const matches = text.match(headingPattern);
  return matches ? matches.length : 0;
}

/**
 * Helper function to count paragraphs in text
 */
function countParagraphs(text: string): number {
  // Count blocks of text separated by blank lines
  const paragraphPattern = /(?:\n|^)(.+)(?:\n\s*\n|$)/g;
  const matches = text.match(paragraphPattern);
  return matches ? matches.length : 0;
}

/**
 * Helper function to count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
} 