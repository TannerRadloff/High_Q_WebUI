import { NextRequest, NextResponse } from 'next/server';
import { AgentRunner, RunResult, StreamRunCallbacks } from '../../../runner';
import { ResearchAgent } from '../../../agents/ResearchAgent';
import { ReportAgent } from '../../../agents/ReportAgent';
import { TriageAgent, TaskType, TriageResult } from '../../../agents/TriageAgent';
import { AgentResponse, StreamCallbacks } from '../../../agents/agent';
import { RunConfig } from '../../../agents/tracing';
import AgentStateService from '../../../services/agentStateService';
import { v4 as uuidv4 } from 'uuid';
import { AgentType } from '../../../agents/AgentFactory';
import { BaseAgent } from '../../../agents/BaseAgent';
import { includeSensitiveData } from '../../../agents/api-utils';

// Update the AgentRequest type to match our service
type AgentStreamResult = {
  inputList: any[];
  metadata?: any;
};

// Define the AgentRequest type with properly typed properties
type AgentRequest = {
  id: string;
  timestamp: string;
  query: string;
  agentType: AgentType;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  response?: string; // Using response instead of result for consistency
  error?: string;
  streamResult?: AgentStreamResult;
  userId?: string;
};

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
    const { 
      query, 
      agentType = 'auto', 
      stream = false,
      workflow_name,
      group_id,
      tracing_disabled,
      trace_include_sensitive_data,
      metadata = {} 
    } = body;
    
    // Generate a unique request ID
    const requestId = `req_${uuidv4()}`;
    
    // Create run config for tracing
    const runConfig: RunConfig = {
      workflow_name: workflow_name || `API Request - ${agentType}`,
      group_id,
      tracing_disabled,
      trace_include_sensitive_data,
      trace_metadata: {
        ...metadata,
        requestId,
        ip
      }
    };
    
    // Validate request
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }
    
    // Record the new request
    AgentStateService.recordRequest({
      id: requestId,
      timestamp: new Date().toISOString(),
      query,
      agentType: getAgentTypeEnum(agentType),
      status: 'pending',
      userId: ip // Add the user ID to track conversation history
    });
    
    // Update agent state to working
    AgentStateService.updateAgentState(
      getAgentTypeEnum(agentType),
      'working',
      query.substring(0, 50) + (query.length > 50 ? '...' : '')
    );
    
    // If streaming is requested, handle it differently
    if (stream) {
      return handleStreamingResponse(query, agentType, requestId, runConfig);
    }
    
    // Non-streaming response handling
    // Record start time for performance tracking
    const startTime = Date.now();
    let result: { success: boolean; content?: string; output?: string; error?: string; metadata?: any };
    
    try {
      // Update request status to in-progress
      AgentStateService.updateRequest(requestId, { status: 'in-progress' });
      
      // Create a runner with the appropriate agent based on the requested type
      const runner = createRunnerForAgentType(agentType);
      
      // Get previous context if this is a follow-up message
      const prevRequest = AgentStateService.getRequestsByUser(ip)[0];
      
      // Check for context to make conversation
      let inputData: string | any[] = query;
      
      if (prevRequest?.streamResult?.inputList && prevRequest.id !== requestId) {
        // Use previous conversation context for follow-up
        inputData = [
          ...prevRequest.streamResult.inputList,
          { role: 'user', content: query }
        ];
      }
      
      // Run the agent using the runner with max_turns parameter
      const runResult = await runner.run(inputData, {
        ...runConfig, 
        max_turns: 25 // Default max turns for API requests
      });
      
      // Store input list for future conversations
      AgentStateService.updateRequest(requestId, {
        streamResult: {
          inputList: runResult.to_input_list(),
          metadata: runResult.metadata
        } as AgentStreamResult
      });
      
      // Format the result for API response
      result = {
        success: runResult.success,
        content: runResult.output, // For backwards compatibility
        output: runResult.output,
        error: runResult.error,
        metadata: {
          ...runResult.metadata,
          processingTime: Date.now() - startTime
        }
      };
      
      // Update request status
      AgentStateService.updateRequest(requestId, { 
        status: result.success ? 'completed' : 'failed',
        response: result.success ? (result.output || '') : undefined, // Using response instead of result
        error: result.error
      });
      
      // Update agent state to idle
      AgentStateService.updateAgentState(
        getAgentTypeEnum(agentType),
        'idle',
        ''
      );
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('API error:', error);
      
      // Update request status
      AgentStateService.updateRequest(requestId, { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Update agent state to idle
      AgentStateService.updateAgentState(
        getAgentTypeEnum(agentType),
        'idle',
        ''
      );
      
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error during processing',
          metadata: {
            requestId,
            processingTime: Date.now() - startTime
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unhandled error in API route'
      },
      { status: 500 }
    );
  }
}

/**
 * Creates a runner with the appropriate agent based on the requested type
 */
function createRunnerForAgentType(agentType: string): AgentRunner {
  let agent: BaseAgent | undefined = undefined;
  
  // Create specific agent if requested, otherwise use default DelegationAgent
  switch (agentType) {
    case 'triage':
      agent = new TriageAgent() as unknown as BaseAgent;
      break;
      
    case 'research':
      agent = new ResearchAgent() as unknown as BaseAgent;
      break;
      
    case 'report':
      agent = new ReportAgent() as unknown as BaseAgent;
      break;
  }
  
  // Return a runner with the selected agent or the default DelegationAgent
  return new AgentRunner(agent);
}

/**
 * Handle a streaming response for agent-based processing
 */
async function handleStreamingResponse(
  query: string,
  agentType: string,
  requestId: string,
  runConfig: RunConfig
): Promise<Response> {
  // Create an encoder for the stream
  const encoder = new TextEncoder();
  
  // Variables to keep track of the response
  let controller: ReadableStreamDefaultController | null = null;
  let currentResponse = '';
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let requestTimeout: NodeJS.Timeout | null = null;
  
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller_) {
      controller = controller_;
      
      // Set up a heartbeat to keep the connection alive
      heartbeatInterval = setInterval(() => {
        const heartbeatEvent = {
          event: 'heartbeat', 
          data: JSON.stringify({ 
            timestamp: new Date().toISOString() 
          })
        };
        controller?.enqueue(encoder.encode(`event: ${heartbeatEvent.event}\ndata: ${heartbeatEvent.data}\n\n`));
      }, HEARTBEAT_INTERVAL);
      
      // Safety timeout to end abandoned requests
      requestTimeout = setTimeout(() => {
        endStreamWithError('Request timed out. Please try again.');
      }, REQUEST_TIMEOUT);
    },
    
    cancel() {
      // Clean up on client disconnect
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (requestTimeout) clearTimeout(requestTimeout);
      
      console.log(`Stream for ${requestId} was cancelled by the client`);
      
      // Update agent state to idle
      AgentStateService.updateAgentState(
        getAgentTypeEnum(agentType),
        'idle',
        ''
      );
      
      // Update request status if not already completed
      AgentStateService.updateRequest(requestId, {
        status: 'failed',
        error: 'Request cancelled by client'
      });
    }
  });
  
  // Function to end the stream with an error
  function endStreamWithError(errorMessage: string) {
    // Only proceed if controller exists
    if (!controller) return;
    
    // Create an error event
    const errorEvent = {
      event: 'error',
      data: JSON.stringify({ error: errorMessage })
    };
    
    // Send the error message
    controller.enqueue(encoder.encode(`event: ${errorEvent.event}\ndata: ${errorEvent.data}\n\n`));
    
    // End the stream
    controller.close();
    
    // Clean up intervals
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (requestTimeout) clearTimeout(requestTimeout);
    
    // Update agent state to idle
    AgentStateService.updateAgentState(
      getAgentTypeEnum(agentType),
      'idle',
      ''
    );
    
    // Update request status
    AgentStateService.updateRequest(requestId, {
      status: 'failed',
      error: errorMessage
    });
  }
  
  // Start a background process to handle the actual agent call
  (async () => {
    try {
      // Update request status
      AgentStateService.updateRequest(requestId, {
        status: 'in-progress'
      });
      
      // Create the appropriate runner
      const runner = createRunnerForAgentType(agentType);
      
      // Define streaming callbacks
      const callbacks: StreamRunCallbacks = {
        onStart: () => {
          if (!controller) return;
          
          // Reset timeout since we've started
          if (requestTimeout) {
            clearTimeout(requestTimeout);
            requestTimeout = null;
          }
          
          // Send a start event
          const startEvent = {
            event: 'start',
            data: JSON.stringify({
              requestId,
              timestamp: new Date().toISOString()
            })
          };
          
          controller.enqueue(encoder.encode(`event: ${startEvent.event}\ndata: ${startEvent.data}\n\n`));
        },
        
        onToken: (token) => {
          if (!controller) return;
          
          // Append to current response
          currentResponse += token;
          
          // Create a token event
          const tokenEvent = {
            event: 'token',
            data: JSON.stringify({
              token,
              // Only include full response if not sensitive
              fullResponse: includeSensitiveData ? currentResponse : undefined
            })
          };
          
          // Send the token event
          controller.enqueue(encoder.encode(`event: ${tokenEvent.event}\ndata: ${tokenEvent.data}\n\n`));
        },
        
        onTriageComplete: (result) => {
          if (!controller) return;
          
          // Create a triage event
          const triageEvent = {
            event: 'triage',
            data: JSON.stringify({ result })
          };
          
          // Send the triage event
          controller.enqueue(encoder.encode(`event: ${triageEvent.event}\ndata: ${triageEvent.data}\n\n`));
        },
        
        onResearchStart: () => {
          if (!controller) return;
          
          // Create a research start event
          const researchEvent = {
            event: 'research_start',
            data: JSON.stringify({
              timestamp: new Date().toISOString()
            })
          };
          
          // Send the research start event
          controller.enqueue(encoder.encode(`event: ${researchEvent.event}\ndata: ${researchEvent.data}\n\n`));
        },
        
        onResearchComplete: (researchData) => {
          if (!controller) return;
          
          // Create a research complete event
          const researchEvent = {
            event: 'research_complete',
            data: JSON.stringify({
              data: researchData,
              timestamp: new Date().toISOString()
            })
          };
          
          // Send the research complete event
          controller.enqueue(encoder.encode(`event: ${researchEvent.event}\ndata: ${researchEvent.data}\n\n`));
        },
        
        onReportStart: () => {
          if (!controller) return;
          
          // Create a report start event
          const reportEvent = {
            event: 'report_start',
            data: JSON.stringify({
              timestamp: new Date().toISOString()
            })
          };
          
          // Send the report start event
          controller.enqueue(encoder.encode(`event: ${reportEvent.event}\ndata: ${reportEvent.data}\n\n`));
        },
        
        onHandoff: (fromAgent, toAgent) => {
          if (!controller) return;
          
          // Create a handoff event
          const handoffEvent = {
            event: 'handoff',
            data: JSON.stringify({
              from: fromAgent,
              to: toAgent,
              timestamp: new Date().toISOString()
            })
          };
          
          // Send the handoff event
          controller.enqueue(encoder.encode(`event: ${handoffEvent.event}\ndata: ${handoffEvent.data}\n\n`));
        },
        
        onComplete: (result: AgentResponse | RunResult) => {
          if (!controller) return;
          
          // Clean up intervals
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          
          if (requestTimeout) {
            clearTimeout(requestTimeout);
            requestTimeout = null;
          }
          
          // Get content from the result
          const content = 'content' in result 
            ? result.content 
            : ('output' in result ? result.output : '');
          
          // Create a complete event
          const completeEvent = {
            event: 'complete',
            data: JSON.stringify({
              success: result.success === false ? false : true,
              content,
              error: result.error,
              metadata: result.metadata,
              timestamp: new Date().toISOString()
            })
          };
          
          // Send the complete event
          controller.enqueue(encoder.encode(`event: ${completeEvent.event}\ndata: ${completeEvent.data}\n\n`));
          
          // End the stream
          controller.close();
          
          // Update agent state to idle
          AgentStateService.updateAgentState(
            getAgentTypeEnum(agentType),
            'idle',
            ''
          );
          
          // Update request status
          AgentStateService.updateRequest(requestId, {
            status: result.success === false ? 'failed' : 'completed',
            response: content,
            error: result.error
          });
        },
        
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          endStreamWithError(errorMessage);
        }
      };
      
      // Run the agent with streaming
      const streamResult = await runner.run_streamed(query, callbacks, {
        ...runConfig,
        max_turns: 25 // Default max turns for API requests
      });
      
      // Store the result in the context for potential follow-up messages
      AgentStateService.updateRequest(requestId, {
        streamResult: {
          // Only store what's needed for future to_input_list calls
          inputList: streamResult.to_input_list(),
          metadata: streamResult.metadata
        } as AgentStreamResult
      });
      
    } catch (error) {
      console.error(`Error in agent stream for ${requestId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in agent stream';
      endStreamWithError(errorMessage);
    }
  })();
  
  // Set response headers for SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
      'X-Request-ID': requestId
    }
  });
}

/**
 * Map string agent type to enum
 */
function getAgentTypeEnum(type: string): AgentType {
  switch (type) {
    case 'research': return AgentType.RESEARCH;
    case 'report': return AgentType.REPORT;
    case 'triage': return AgentType.TRIAGE;
    case 'auto': 
    case 'delegation': 
      return AgentType.DELEGATION;
    default: return AgentType.DELEGATION;
  }
} 