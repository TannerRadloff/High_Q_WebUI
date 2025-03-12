// orchestrator.ts
import { ResearchAgent } from './agents/ResearchAgent';
import { ReportAgent } from './agents/ReportAgent';
import { AgentResponse, StreamCallbacks } from './agents/agent';

export interface OrchestrationResult {
  success: boolean;
  report: string;
  error?: string;
  metadata?: {
    researchSuccess: boolean;
    reportSuccess: boolean;
    executionTimeMs: number;
    [key: string]: any;
  }
}

export interface StreamOrchestrationCallbacks extends StreamCallbacks {
  onResearchStart?: () => void;
  onResearchComplete?: (researchData: string) => void;
  onReportStart?: () => void;
}

export class Orchestrator {
  private researchAgent: ResearchAgent;
  private reportAgent: ReportAgent;

  constructor() {
    this.researchAgent = new ResearchAgent();
    this.reportAgent = new ReportAgent();
  }

  /**
   * Handles a user query by first getting research data and then writing a report.
   * Returns an OrchestrationResult with the report and metadata.
   */
  async handleQuery(userQuery: string): Promise<OrchestrationResult> {
    const startTime = Date.now();
    
    try {
      // 1. Validate input
      if (!userQuery || userQuery.trim() === '') {
        return {
          success: false,
          report: '',
          error: 'Empty query provided. Please provide a valid research query.',
          metadata: {
            researchSuccess: false,
            reportSuccess: false,
            executionTimeMs: Date.now() - startTime
          }
        };
      }
      
      // 2. Get research data using the Research Agent
      const researchResponse = await this.researchAgent.handleTask(userQuery);
      
      // If research failed, return early with the error
      if (!researchResponse.success) {
        return {
          success: false,
          report: '',
          error: `Research failed: ${researchResponse.error}`,
          metadata: {
            researchSuccess: false,
            reportSuccess: false,
            executionTimeMs: Date.now() - startTime,
            researchMetadata: researchResponse.metadata
          }
        };
      }
      
      // 3. Combine the research data with the original query
      const promptForReport = `User asked: "${userQuery}".\n\nResearch Notes:\n${researchResponse.content}\n\nPlease write a comprehensive report that integrates this information with clear citations.`;
      
      // 4. Generate a report using the Report Agent
      const reportResponse = await this.reportAgent.handleTask(promptForReport);
      
      // Calculate total execution time
      const executionTimeMs = Date.now() - startTime;
      
      // 5. Return the combined result
      return {
        success: reportResponse.success,
        report: reportResponse.content,
        error: reportResponse.error,
        metadata: {
          researchSuccess: researchResponse.success,
          reportSuccess: reportResponse.success,
          executionTimeMs,
          researchMetadata: researchResponse.metadata,
          reportMetadata: reportResponse.metadata,
          originalQuery: userQuery
        }
      };
    } catch (error) {
      console.error('Orchestration error:', error);
      return {
        success: false,
        report: 'An error occurred during the research and report generation process.',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          researchSuccess: false,
          reportSuccess: false,
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Stream the entire orchestration process, from research to report generation.
   * @param userQuery The user's query to research and report on
   * @param callbacks Callbacks for handling the streaming process
   */
  async streamQuery(
    userQuery: string,
    callbacks: StreamOrchestrationCallbacks
  ): Promise<void> {
    const startTime = Date.now();
    let researchData = '';
    
    try {
      // 1. Validate input
      if (!userQuery || userQuery.trim() === '') {
        callbacks.onError?.(new Error('Empty query provided. Please provide a valid research query.'));
        return;
      }
      
      // Notify that orchestration has started
      callbacks.onStart?.();
      
      // 2. Stream the research process
      callbacks.onResearchStart?.();
      callbacks.onToken?.('🔍 Researching your query...\n\n');
      
      await this.researchAgent.streamTask(
        userQuery,
        {
          onToken: (token) => {
            researchData += token;
            // We could forward these tokens, but to make it clear to the user what's happening,
            // we don't forward them directly
          },
          onError: (error) => {
            callbacks.onError?.(new Error(`Research failed: ${error.message}`));
          },
          onComplete: (researchResponse) => {
            if (!researchResponse.success) {
              callbacks.onError?.(new Error(`Research failed: ${researchResponse.error}`));
              return;
            }
            
            researchData = researchResponse.content;
            callbacks.onResearchComplete?.(researchData);
            
            // Now show a summary of the research
            const researchSummary = this.createResearchSummary(researchData);
            callbacks.onToken?.(`\n\n📋 Research complete. Found information from ${this.countCitations(researchData)} sources.\n\n`);
            callbacks.onToken?.(researchSummary);
          }
        }
      );
      
      // If research was unsuccessful, we would have already called onError and returned
      
      // 3. Combine the research data with the original query
      const promptForReport = `User asked: "${userQuery}".\n\nResearch Notes:\n${researchData}\n\nPlease write a comprehensive report that integrates this information with clear citations.`;
      
      // 4. Stream the report generation
      callbacks.onReportStart?.();
      callbacks.onToken?.('\n\n📝 Generating your report...\n\n');
      
      await this.reportAgent.streamTask(
        promptForReport,
        {
          onToken: (token) => {
            callbacks.onToken?.(token);
          },
          onError: (error) => {
            callbacks.onError?.(new Error(`Report generation failed: ${error.message}`));
          },
          onComplete: (reportResponse) => {
            if (!reportResponse.success) {
              callbacks.onError?.(new Error(`Report generation failed: ${reportResponse.error}`));
              return;
            }
            
            // Calculate total execution time
            const executionTimeMs = Date.now() - startTime;
            
            // Complete the stream with metadata
            callbacks.onComplete?.({
              success: true,
              content: reportResponse.content,
              metadata: {
                streaming: true,
                executionTimeMs,
                researchSuccess: true,
                reportSuccess: true,
                originalQuery: userQuery
              }
            });
          }
        }
      );
    } catch (error) {
      console.error('Orchestration streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Helper method to create a brief summary of the research data
   */
  private createResearchSummary(researchData: string): string {
    // This is a simplified summary - in a real implementation, you might want to
    // use NLP or another model to generate a more sophisticated summary
    const sentences = researchData.split(/[.!?]/).filter(s => s.trim().length > 0);
    const wordCount = researchData.split(/\s+/).length;
    
    let summary = '';
    if (sentences.length > 3) {
      // Take first 2-3 sentences as a summary
      summary = sentences.slice(0, 3).join('. ') + '.\n\n';
      summary += `Research contains ${wordCount} words from ${this.countCitations(researchData)} sources.\n\n`;
    }
    
    return summary;
  }

  /**
   * Count citations in the provided text
   */
  public countCitations(text: string): number {
    // This is a simplified citation counter - in a real implementation,
    // you would use a more sophisticated algorithm
    const urlMatches = text.match(/https?:\/\/[^\s\]]+/g) || [];
    const bracketCitations = text.match(/\[[^\]]+\]/g) || [];
    const footnoteCitations = text.match(/\[\d+\]/g) || [];
    
    // Combine unique citations
    const allCitations = new Set([
      ...urlMatches,
      ...bracketCitations,
      ...footnoteCitations
    ]);
    
    return allCitations.size || 1; // Return at least 1 if no citations found
  }
} 