import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator, OrchestrationResult, StreamOrchestrationCallbacks } from '../../../orchestrator';
import { ResearchAgent } from '../../../agents/ResearchAgent';
import { ReportAgent } from '../../../agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from '../../../agents/TriageAgent';
import { AgentResponse, StreamCallbacks } from '../../../agents/agent';

// Simple in-memory rate limiting (would be replaced with Redis or similar in production)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const ipRequests = new Map<string, { count: number, resetTime: number }>();

// Add heartbeat interval and timeout constants
const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const REQUEST_TIMEOUT = 60000; // 1 minute

function rateLimitCheck(ip: string): { allowed: boolean, message?: string } {
  const now = Date.now();
  const record = ipRequests.get(ip);
  
  if (!record || now > record.resetTime) {
    // First request or reset window
    ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // Too many requests
    const timeToReset = Math.ceil((record.resetTime - now) / 1000);
    return { 
      allowed: false, 
      message: `Rate limit exceeded. Try again in ${timeToReset} seconds.`
    };
  }
  
  // Increment counter for this window
  record.count += 1;
  ipRequests.set(ip, record);
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    // Basic rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = rateLimitCheck(ip);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.message },
        { status: 429 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { query, agentType = 'auto', stream = false } = body;
    
    // Validate request
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }
    
    // If streaming is requested, handle it differently
    if (stream) {
      return handleStreamingResponse(query, agentType);
    }
    
    // Non-streaming response handling
    // Record start time for performance tracking
    const startTime = Date.now();
    let result: { success: boolean; content?: string; report?: string; error?: string; metadata?: any };
    
    // Route to the appropriate agent based on the agentType
    switch (agentType) {
      case 'triage':
        // Only perform triage without executing agents
        const triageAgent = new TriageAgent();
        const triageResponse: AgentResponse = await triageAgent.handleTask(query);
        
        if (triageResponse.success) {
          // Parse the triage result
          try {
            const triageResult = JSON.parse(triageResponse.content) as TriageResult;
            result = {
              success: true,
              content: triageResponse.content,
              metadata: {
                ...triageResponse.metadata,
                processingTime: Date.now() - startTime,
                taskType: triageResult.taskType
              }
            };
          } catch (parseError) {
            result = {
              success: false,
              error: 'Failed to parse triage response',
              content: triageResponse.content,
              metadata: {
                processingTime: Date.now() - startTime,
                parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
              }
            };
          }
        } else {
          result = {
            success: false,
            error: triageResponse.error,
            metadata: {
              processingTime: Date.now() - startTime
            }
          };
        }
        break;
        
      case 'research':
        const researchAgent = new ResearchAgent();
        const researchResponse: AgentResponse = await researchAgent.handleTask(query);
        result = {
          success: researchResponse.success,
          content: researchResponse.content,
          error: researchResponse.error,
          metadata: {
            ...researchResponse.metadata,
            processingTime: Date.now() - startTime,
            taskType: TaskType.RESEARCH
          }
        };
        break;
        
      case 'report':
        const reportAgent = new ReportAgent();
        const reportResponse: AgentResponse = await reportAgent.handleTask(query);
        result = {
          success: reportResponse.success,
          content: reportResponse.content,
          error: reportResponse.error,
          metadata: {
            ...reportResponse.metadata,
            processingTime: Date.now() - startTime,
            taskType: TaskType.REPORT
          }
        };
        break;

      case 'auto':
      case 'orchestrator':
      default:
        // Use the orchestrator with dynamic triage
        const orchestrator = new Orchestrator();
        const orchestratorResult: OrchestrationResult = await orchestrator.handleQuery(query);
        
        result = {
          success: orchestratorResult.success,
          report: orchestratorResult.report,
          error: orchestratorResult.error,
          metadata: {
            ...orchestratorResult.metadata,
            processingTime: Date.now() - startTime
          }
        };
        break;
    }
    
    // Return the result as JSON
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming response for real-time agent output
 */
function handleStreamingResponse(query: string, agentType: string): Response {
  // Create a readable stream from a ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Set up and encode the initial response
        sendEventMessage(controller, { 
          event: 'start', 
          data: { message: 'Stream started' }
        });
        
        // Set up heartbeat to prevent connection timeouts
        const heartbeatInterval = setInterval(() => {
          sendEventMessage(controller, {
            event: 'heartbeat',
            data: { timestamp: Date.now() }
          });
        }, HEARTBEAT_INTERVAL);
        
        // Set request timeout
        const timeoutId = setTimeout(() => {
          clearInterval(heartbeatInterval);
          sendEventMessage(controller, {
            event: 'error',
            data: { message: 'Request timed out' }
          });
          controller.close();
        }, REQUEST_TIMEOUT);
        
        // Shared error handler
        const handleError = (error: Error) => {
          clearInterval(heartbeatInterval);
          clearTimeout(timeoutId);
          
          console.error(`Stream error in ${agentType}:`, error);
          sendEventMessage(controller, { 
            event: 'error', 
            data: { message: error.message } 
          });
          controller.close();
        };
        
        // Shared token handler to send event to client
        const handleToken = (token: string) => {
          sendEventMessage(controller, {
            event: 'token',
            data: { token }
          });
        };
        
        // Shared completion handler
        const handleComplete = (response: AgentResponse) => {
          clearInterval(heartbeatInterval);
          clearTimeout(timeoutId);
          
          sendEventMessage(controller, {
            event: 'complete',
            data: {
              success: response.success,
              content: response.content,
              metadata: response.metadata
            }
          });
          controller.close();
        };
        
        // Route to the appropriate agent based on the agentType
        switch (agentType) {
          case 'triage': {
            const triageAgent = new TriageAgent();
            if (!triageAgent.streamTask) {
              // Triage doesn't support streaming, so fake it with regular task execution
              try {
                sendEventMessage(controller, {
                  event: 'agent_start',
                  data: { agent: 'triage' }
                });
                
                const response = await triageAgent.handleTask(query);
                if (response.success) {
                  try {
                    const triageResult = JSON.parse(response.content) as TriageResult;
                    handleToken(`Analyzed your query. This appears to be a ${triageResult.taskType} task.\n\n`);
                    handleToken(`Reasoning: ${triageResult.reasoning}\n\n`);
                    
                    if (triageResult.modifiedQuery && triageResult.modifiedQuery !== query) {
                      handleToken(`Suggested query reformulation: ${triageResult.modifiedQuery}\n\n`);
                    }
                  } catch (parseError) {
                    handleToken('Analysis complete, but could not parse the result format.\n\n');
                  }
                }
                handleComplete(response);
              } catch (error) {
                handleError(error instanceof Error ? error : new Error('Triage processing failed'));
              }
              return;
            }
            
            // If triage agent implements streamTask in the future, this code would run
            await triageAgent.streamTask(
              query,
              {
                onStart: () => {
                  sendEventMessage(controller, {
                    event: 'agent_start',
                    data: { agent: 'triage' }
                  });
                },
                onToken: handleToken,
                onError: handleError,
                onComplete: handleComplete
              }
            );
            break;
          }
          
          case 'research': {
            const researchAgent = new ResearchAgent();
            if (!researchAgent.streamTask) {
              handleError(new Error('Research agent does not support streaming'));
              return;
            }
            
            await researchAgent.streamTask(
              query,
              {
                onStart: () => {
                  sendEventMessage(controller, {
                    event: 'agent_start',
                    data: { agent: 'research' }
                  });
                },
                onToken: handleToken,
                onError: handleError,
                onComplete: handleComplete
              }
            );
            break;
          }
            
          case 'report': {
            const reportAgent = new ReportAgent();
            if (!reportAgent.streamTask) {
              handleError(new Error('Report agent does not support streaming'));
              return;
            }
            
            await reportAgent.streamTask(
              query,
              {
                onStart: () => {
                  sendEventMessage(controller, {
                    event: 'agent_start',
                    data: { agent: 'report' }
                  });
                },
                onToken: handleToken,
                onError: handleError,
                onComplete: handleComplete
              }
            );
            break;
          }
            
          case 'auto':
          case 'orchestrator':
          default: {
            const orchestrator = new Orchestrator();
            
            await orchestrator.streamQuery(
              query,
              {
                onStart: () => {
                  sendEventMessage(controller, {
                    event: 'agent_start',
                    data: { agent: 'orchestrator' }
                  });
                },
                
                onTriageComplete: (triageResult) => {
                  sendEventMessage(controller, {
                    event: 'triage_complete',
                    data: { 
                      taskType: triageResult.taskType,
                      confidence: triageResult.confidence,
                      reasoning: triageResult.reasoning
                    }
                  });
                },
                
                onResearchStart: () => {
                  sendEventMessage(controller, {
                    event: 'research_start',
                    data: { message: 'Starting research phase' }
                  });
                },
                
                onResearchComplete: (researchData) => {
                  sendEventMessage(controller, {
                    event: 'research_complete',
                    data: { 
                      message: 'Research phase complete',
                      citations: orchestrator.countCitations(researchData)
                    }
                  });
                },
                
                onReportStart: () => {
                  sendEventMessage(controller, {
                    event: 'report_start',
                    data: { message: 'Starting report generation' }
                  });
                },
                
                onToken: handleToken,
                onError: handleError,
                onComplete: handleComplete
              }
            );
            break;
          }
        }
      } catch (error) {
        console.error('Stream setup error:', error);
        sendEventMessage(controller, { 
          event: 'error', 
          data: { message: error instanceof Error ? error.message : 'Unknown stream error' } 
        });
        controller.close();
      }
    }
  });
  
  // Return the stream as a server-sent events response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

/**
 * Send an SSE-formatted message through the controller
 */
function sendEventMessage(
  controller: ReadableStreamDefaultController,
  { event, data }: { event: string; data: any }
): void {
  // Format as SSE
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  // Send to client
  controller.enqueue(new TextEncoder().encode(message));
} 