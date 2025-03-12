// orchestrator.ts
import { ResearchAgent } from './agents/ResearchAgent';
import { ReportAgent } from './agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from './agents/TriageAgent';
import { AgentResponse, StreamCallbacks } from './agents/agent';
import { trace, agent_span, generation_span, function_span, RunConfig, configureTracing } from './agents/tracing';

export interface OrchestrationResult {
  success: boolean;
  report: string;
  error?: string;
  metadata?: {
    taskType?: TaskType;
    researchSuccess?: boolean;
    reportSuccess?: boolean;
    executionTimeMs: number;
    [key: string]: any;
  }
}

export interface StreamOrchestrationCallbacks extends StreamCallbacks {
  onTriageComplete?: (result: TriageResult) => void;
  onResearchStart?: () => void;
  onResearchComplete?: (researchData: string) => void;
  onReportStart?: () => void;
}

export class Orchestrator {
  private researchAgent: ResearchAgent;
  private reportAgent: ReportAgent;
  private triageAgent: TriageAgent;

  constructor() {
    this.researchAgent = new ResearchAgent();
    this.reportAgent = new ReportAgent();
    this.triageAgent = new TriageAgent();
  }

  /**
   * Handles a user query by:
   * 1. Triaging to determine the appropriate agent(s)
   * 2. Routing to the appropriate workflow based on triage results
   * Returns an OrchestrationResult with the report and metadata.
   */
  async handleQuery(userQuery: string, config?: RunConfig): Promise<OrchestrationResult> {
    // Configure tracing based on provided config
    configureTracing(config);
    
    // Create a trace for this query
    const queryTrace = trace(config?.workflow_name || "Agent query", config);
    const traceInstance = queryTrace.start();
    
    const startTime = Date.now();
    
    try {
      // 1. Validate input
      if (!userQuery || userQuery.trim() === '') {
        const result = {
          success: false,
          report: '',
          error: 'Empty query provided. Please provide a valid research query.',
          metadata: {
            executionTimeMs: Date.now() - startTime
          }
        };
        
        await queryTrace.finish();
        return result;
      }
      
      // 2. Triage the query to determine which agents to use
      const triageSpan = agent_span("Triage Agent", {
        agent_name: this.triageAgent.name,
        input: userQuery
      });
      
      triageSpan.enter();
      const triageResponse = await this.triageAgent.handleTask(userQuery);
      triageSpan.exit();
      
      if (!triageResponse.success) {
        const result = {
          success: false,
          report: '',
          error: `Triage failed: ${triageResponse.error}`,
          metadata: {
            executionTimeMs: Date.now() - startTime
          }
        };
        
        await queryTrace.finish();
        return result;
      }
      
      // Parse the triage result
      const triageResult = JSON.parse(triageResponse.content) as TriageResult;
      
      // Use the modified query if provided, otherwise use the original
      const processedQuery = triageResult.modifiedQuery || userQuery;
      
      // 3. Route to the appropriate workflow based on task type
      let result: OrchestrationResult;
      
      switch (triageResult.taskType) {
        case TaskType.RESEARCH:
          result = await this.handleResearchTask(processedQuery, startTime);
          break;
        case TaskType.REPORT:
          result = await this.handleReportTask(processedQuery, startTime);
          break;
        case TaskType.COMBINED:
          result = await this.handleCombinedTask(processedQuery, startTime);
          break;
        case TaskType.UNKNOWN:
        default:
          // Fallback to combined task for unknown types
          result = await this.handleCombinedTask(processedQuery, startTime);
          break;
      }
      
      // Add triage metadata to the result
      const finalResult = {
        ...result,
        metadata: {
          ...(result.metadata || { executionTimeMs: Date.now() - startTime }),
          taskType: triageResult.taskType,
          triageConfidence: triageResult.confidence,
          triageReasoning: triageResult.reasoning,
          originalQuery: userQuery,
          processedQuery,
          trace_id: traceInstance.trace_id
        }
      };
      
      await queryTrace.finish();
      return finalResult;
    } catch (error) {
      console.error('Orchestration error:', error);
      const result = {
        success: false,
        report: 'An error occurred during the research and report generation process.',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTimeMs: Date.now() - startTime,
          trace_id: traceInstance.trace_id
        }
      };
      
      await queryTrace.finish();
      return result;
    }
  }
  
  /**
   * Handle a research-only task
   */
  private async handleResearchTask(query: string, startTime: number): Promise<OrchestrationResult> {
    const researchSpan = agent_span("Research Agent", {
      agent_name: this.researchAgent.name,
      input: query
    });
    
    researchSpan.enter();
    const researchResponse = await this.researchAgent.handleTask(query);
    researchSpan.exit();
    
    return {
      success: researchResponse.success,
      report: researchResponse.content,
      error: researchResponse.error,
      metadata: {
        taskType: TaskType.RESEARCH,
        researchSuccess: researchResponse.success,
        executionTimeMs: Date.now() - startTime,
        researchMetadata: researchResponse.metadata
      }
    };
  }
  
  /**
   * Handle a report-only task
   */
  private async handleReportTask(query: string, startTime: number): Promise<OrchestrationResult> {
    const reportSpan = agent_span("Report Agent", {
      agent_name: this.reportAgent.name,
      input: query
    });
    
    reportSpan.enter();
    const reportResponse = await this.reportAgent.handleTask(query);
    reportSpan.exit();
    
    return {
      success: reportResponse.success,
      report: reportResponse.content,
      error: reportResponse.error,
      metadata: {
        taskType: TaskType.REPORT,
        reportSuccess: reportResponse.success,
        executionTimeMs: Date.now() - startTime,
        reportMetadata: reportResponse.metadata
      }
    };
  }
  
  /**
   * Handle a combined research and report task
   */
  private async handleCombinedTask(query: string, startTime: number): Promise<OrchestrationResult> {
    // 1. Get research data using the Research Agent
    const researchSpan = agent_span("Research Agent", {
      agent_name: this.researchAgent.name,
      input: query
    });
    
    researchSpan.enter();
    const researchResponse = await this.researchAgent.handleTask(query);
    researchSpan.exit();
    
    // If research failed, return early with the error
    if (!researchResponse.success) {
      return {
        success: false,
        report: '',
        error: `Research failed: ${researchResponse.error}`,
        metadata: {
          taskType: TaskType.COMBINED,
          researchSuccess: false,
          reportSuccess: false,
          executionTimeMs: Date.now() - startTime,
          researchMetadata: researchResponse.metadata
        }
      };
    }
    
    // 2. Combine the research data with the original query
    const promptForReport = `User asked: "${query}".\n\nResearch Notes:\n${researchResponse.content}\n\nPlease write a comprehensive report that integrates this information with clear citations.`;
    
    // 3. Generate a report using the Report Agent
    const reportSpan = agent_span("Report Agent", {
      agent_name: this.reportAgent.name,
      input: promptForReport
    });
    
    reportSpan.enter();
    const reportResponse = await this.reportAgent.handleTask(promptForReport);
    reportSpan.exit();
    
    // Calculate total execution time
    const executionTimeMs = Date.now() - startTime;
    
    // 4. Return the combined result
    return {
      success: reportResponse.success,
      report: reportResponse.content,
      error: reportResponse.error,
      metadata: {
        taskType: TaskType.COMBINED,
        researchSuccess: researchResponse.success,
        reportSuccess: reportResponse.success,
        executionTimeMs,
        researchMetadata: researchResponse.metadata,
        reportMetadata: reportResponse.metadata,
        originalQuery: query
      }
    };
  }

  /**
   * Stream the entire orchestration process, from triage to final result
   * @param userQuery The user's query to process
   * @param callbacks Callbacks for handling the streaming process
   * @param config Optional run configuration including tracing options
   */
  async streamQuery(
    userQuery: string,
    callbacks: StreamOrchestrationCallbacks,
    config?: RunConfig
  ): Promise<void> {
    // Configure tracing based on provided config
    configureTracing(config);
    
    // Create a trace for this streaming query
    const streamTrace = trace(config?.workflow_name || "Streaming agent query", config);
    const traceInstance = streamTrace.start();
    
    const startTime = Date.now();
    let researchData = '';
    
    try {
      // 1. Validate input
      if (!userQuery || userQuery.trim() === '') {
        callbacks.onError?.(new Error('Empty query provided. Please provide a valid query.'));
        await streamTrace.finish();
        return;
      }
      
      // Notify that orchestration has started
      callbacks.onStart?.();
      
      // 2. Triage the query
      callbacks.onToken?.('🔎 Analyzing your query...\n\n');
      
      const triageSpan = agent_span("Triage Agent Stream", {
        agent_name: this.triageAgent.name,
        input: userQuery
      });
      
      triageSpan.enter();
      const triageResponse = await this.triageAgent.handleTask(userQuery);
      triageSpan.exit();
      
      if (!triageResponse.success) {
        callbacks.onError?.(new Error(`Triage failed: ${triageResponse.error}`));
        await streamTrace.finish();
        return;
      }
      
      // Parse the triage result
      const triageResult = JSON.parse(triageResponse.content) as TriageResult;
      // Use the modified query if provided, otherwise use the original
      const processedQuery = triageResult.modifiedQuery || userQuery;
      
      // Notify about the triage result
      callbacks.onTriageComplete?.(triageResult);
      
      // Add trace ID to the callback context if needed
      const contextWithTrace = {
        trace_id: traceInstance.trace_id
      };
      
      // 3. Route to the appropriate streaming workflow based on task type
      switch (triageResult.taskType) {
        case TaskType.RESEARCH:
          await this.streamResearchTask(processedQuery, callbacks);
          break;
        case TaskType.REPORT:
          await this.streamReportTask(processedQuery, callbacks);
          break;
        case TaskType.COMBINED:
          await this.streamCombinedTask(processedQuery, callbacks);
          break;
        case TaskType.UNKNOWN:
        default:
          // Fallback to combined task for unknown types
          await this.streamCombinedTask(processedQuery, callbacks);
          break;
      }
      
      // Calculate total execution time
      const executionTimeMs = Date.now() - startTime;
      
      // This final callback isn't strictly necessary as the specific task streams
      // should have already called onComplete, but we include it for consistency
      callbacks.onComplete?.({
        success: true,
        content: 'Task completed successfully.',
        metadata: {
          taskType: triageResult.taskType,
          executionTimeMs,
          originalQuery: userQuery,
          processedQuery
        }
      });
      
      // Add trace completion at the end of function
      await streamTrace.finish();
    } catch (error) {
      console.error('Stream orchestration error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
      await streamTrace.finish();
    }
  }
  
  /**
   * Stream a research-only task
   */
  private async streamResearchTask(
    query: string,
    callbacks: StreamOrchestrationCallbacks
  ): Promise<void> {
    callbacks.onResearchStart?.();
    callbacks.onToken?.('🔍 Researching your query...\n\n');
    
    await this.researchAgent.streamTask(
      query,
      {
        onToken: callbacks.onToken,
        onError: callbacks.onError,
        onComplete: (researchResponse) => {
          if (!researchResponse.success) {
            callbacks.onError?.(new Error(`Research failed: ${researchResponse.error}`));
            return;
          }
          
          callbacks.onComplete?.(researchResponse);
        }
      }
    );
  }
  
  /**
   * Stream a report-only task
   */
  private async streamReportTask(
    query: string,
    callbacks: StreamOrchestrationCallbacks
  ): Promise<void> {
    callbacks.onReportStart?.();
    callbacks.onToken?.('📝 Generating your report...\n\n');
    
    await this.reportAgent.streamTask(
      query,
      {
        onToken: callbacks.onToken,
        onError: callbacks.onError,
        onComplete: callbacks.onComplete
      }
    );
  }
  
  /**
   * Stream a combined research and report task
   */
  private async streamCombinedTask(
    query: string,
    callbacks: StreamOrchestrationCallbacks
  ): Promise<void> {
    let researchData = '';
    
    // 1. Stream the research process
    callbacks.onResearchStart?.();
    callbacks.onToken?.('🔍 Researching your query...\n\n');
    
    await this.researchAgent.streamTask(
      query,
      {
        onToken: (token) => {
          researchData += token;
          // We don't forward these tokens to create a clearer user experience
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
    
    // 2. Combine the research data with the original query
    const promptForReport = `User asked: "${query}".\n\nResearch Notes:\n${researchData}\n\nPlease write a comprehensive report that integrates this information with clear citations.`;
    
    // 3. Stream the report generation
    callbacks.onReportStart?.();
    callbacks.onToken?.('\n\n📝 Generating your report...\n\n');
    
    await this.reportAgent.streamTask(
      promptForReport,
      {
        onToken: callbacks.onToken,
        onError: (error) => {
          callbacks.onError?.(new Error(`Report generation failed: ${error.message}`));
        },
        onComplete: callbacks.onComplete
      }
    );
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
  
  /**
   * Helper to get a user-friendly explanation of a task type
   */
  private getTaskExplanation(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.RESEARCH:
        return 'research the latest information on this topic';
      case TaskType.REPORT:
        return 'analyze and summarize this information';
      case TaskType.COMBINED:
        return 'research and prepare a comprehensive report';
      case TaskType.UNKNOWN:
      default:
        return 'process this request';
    }
  }
} 