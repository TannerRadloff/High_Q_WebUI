import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator, OrchestrationResult, StreamOrchestrationCallbacks } from '../../../orchestrator';
import { ResearchAgent } from '../../../agents/ResearchAgent';
import { ReportAgent } from '../../../agents/ReportAgent';
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
    const { query, agentType = 'orchestrator', stream = false } = body;
    
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
      case 'research':
        const researchAgent = new ResearchAgent();
        const researchResponse: AgentResponse = await researchAgent.handleTask(query);
        result = {
          success: researchResponse.success,
          content: researchResponse.content,
          error: researchResponse.error,
          metadata: {
            ...researchResponse.metadata,
            processingTime: Date.now() - startTime
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
            processingTime: Date.now() - startTime
          }
        };
        break;
        
      case 'orchestrator':
      default:
        const orchestrator = new Orchestrator();
        const orchestratorResponse: OrchestrationResult = await orchestrator.handleQuery(query);
        result = {
          success: orchestratorResponse.success,
          report: orchestratorResponse.report,
          error: orchestratorResponse.error,
          metadata: {
            ...orchestratorResponse.metadata,
            processingTime: Date.now() - startTime
          }
        };
        break;
    }
    
    // Return appropriate response based on success/failure
    if (result.success) {
      return NextResponse.json({
        success: true,
        answer: result.content || result.report,
        metadata: result.metadata
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Processing failed',
        metadata: result.metadata
      }, { status: 422 });
    }
  } catch (error) {
    console.error("Agent query error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
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
                onResearchStart: () => {
                  sendEventMessage(controller, {
                    event: 'research_start',
                    data: {}
                  });
                },
                onResearchComplete: (researchData) => {
                  sendEventMessage(controller, {
                    event: 'research_complete',
                    data: { 
                      researchDataLength: researchData.length,
                      sources: orchestrator.countCitations(researchData)
                    }
                  });
                },
                onReportStart: () => {
                  sendEventMessage(controller, {
                    event: 'report_start',
                    data: {}
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
        console.error("Streaming error:", error);
        // Send error as SSE event
        if (error instanceof Error) {
          sendEventMessage(controller, { 
            event: 'error', 
            data: { message: error.message } 
          });
        } else {
          sendEventMessage(controller, { 
            event: 'error', 
            data: { message: 'Unknown streaming error' } 
          });
        }
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