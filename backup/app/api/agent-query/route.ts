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
import { configureAgentSDK, configureAgentTracing, configureAgentLogging } from '@/lib/agents/config';
import { AgentFactory } from '../../../agents/AgentFactory';

// Initialize the OpenAI Agents SDK
configureAgentSDK();
configureAgentTracing(false); // Enable tracing by default
configureAgentLogging(process.env.NODE_ENV === 'development'); // Verbose logging in development

// Update the AgentRequest type to match our service
type AgentStreamResult = {
  inputList: any[];
  metadata?: any;
};

// Define the AgentRequest type with properly typed properties
type AgentRequest = {
  id: string;
  timestamp: number; // Changed from string to number to match the service
  query: string;
  agentType: AgentType;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  response?: string; // Using response instead of result for consistency
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    handoffPath?: string[];
    [key: string]: any;
  };
  // streamResult moved to metadata to match the service
};

// Local extension for our API
interface LocalAgentRequestExtension {
  userId?: string;
  streamResult?: AgentStreamResult;
}

// Combined type for local use
type ExtendedAgentRequest = AgentRequest & LocalAgentRequestExtension;

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
      timestamp: Date.now(),
      query,
      agentType: getAgentTypeEnum(agentType),
      status: 'pending',
    });
    
    // Track user ID separately for our own use
    const userRequestMap = new Map<string, string>();
    userRequestMap.set(requestId, ip);
    
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
      // TODO: Implement proper user-based request retrieval
      // const prevRequest = AgentStateService.getRequestsByUser(ip)[0];
      const prevRequest = AgentStateService.getRequests({ limit: 1 })[0];
      
      // Check for context to make conversation
      let inputData: string | any[] = query;
      
      // Use type assertion to access streamResult
      if ((prevRequest as ExtendedAgentRequest)?.streamResult?.inputList && prevRequest.id !== requestId) {
        // Use previous conversation context for follow-up
        inputData = [
          ...((prevRequest as ExtendedAgentRequest).streamResult?.inputList || []),
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
        // Use type assertion for the update object
        streamResult: {
          inputList: runResult.to_input_list(),
          metadata: runResult.metadata
        }
      } as unknown as Partial<AgentRequest>);
      
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
 * Updated to align with OpenAI Agents SDK
 */
function createRunnerForAgentType(agentType: string): AgentRunner {
  const factory = new AgentFactory();
  const agentTypeEnum = getAgentTypeEnum(agentType);
  
  // Configure tracing as needed
  if (process.env.ENABLE_AGENT_TRACING === 'true') {
    configureAgentTracing(true);
  }
  
  // Configure advanced logging based on environment
  const verboseLogging = process.env.NODE_ENV === 'development';
  configureAgentLogging(verboseLogging);
  
  let agent;
  
  // Create appropriate agent based on type
  switch (agentTypeEnum) {
    case AgentType.MIMIR:
    case AgentType.DELEGATION:
      // Use the new MimirAgent for delegation
      agent = factory.createAgent(AgentType.MIMIR);
      break;
      
    case AgentType.TRIAGE:
      agent = factory.createAgent(AgentType.TRIAGE);
      break;
      
    case AgentType.RESEARCH:
      agent = factory.createAgent(AgentType.RESEARCH);
      break;
      
    case AgentType.REPORT:
      agent = factory.createAgent(AgentType.REPORT);
      break;
      
    case AgentType.JUDGE:
      agent = factory.createAgent(AgentType.JUDGE);
      break;
      
    default:
      // Default to research agent if type is not recognized
      console.warn(`Unknown agent type: ${agentType}, defaulting to Research`);
      agent = factory.createAgent(AgentType.RESEARCH);
  }
  
  // Create a runner for this agent
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
  let delegationInfoSent = false;
  let delegationHeaders: Record<string, string> = {};
  
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
        
        onError: (error) => {
          console.error(`Error in agent execution for ${requestId}:`, error);
          endStreamWithError(typeof error === 'string' ? error : error.message || 'An error occurred during processing');
        },
        
        onComplete: (result) => {
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
          let finalContent = '';
          if (typeof result === 'string') {
            finalContent = result;
          } else if (result && typeof result === 'object') {
            if ('final_output' in result) {
              finalContent = result.final_output as string;
            } else if ('content' in result) {
              finalContent = result.content as string;
            }
            
            // Check for delegation info in metadata
            if (result.metadata?.delegationResult && !delegationInfoSent) {
              const delegationInfo = result.metadata.delegationResult;
              
              // Store delegation info for headers
              delegationHeaders = {
                'x-delegation-status': JSON.stringify({
                  agentName: delegationInfo.agentName,
                  taskDomain: delegationInfo.taskDomain,
                  confidence: delegationInfo.confidence,
                  reasoning: delegationInfo.reasoning
                })
              };
              
              // Send delegation info as a special event
              const delegationEvent = {
                event: 'delegation',
                data: JSON.stringify({
                  agentName: delegationInfo.agentName,
                  reasoning: delegationInfo.reasoning,
                  taskDomain: delegationInfo.taskDomain
                })
              };
              
              controller.enqueue(encoder.encode(`event: ${delegationEvent.event}\ndata: ${delegationEvent.data}\n\n`));
              delegationInfoSent = true;
            }
          }
          
          // Create a complete event
          const completeEvent = {
            event: 'complete',
            data: JSON.stringify({
              content: finalContent,
              metadata: result && typeof result === 'object' ? result.metadata : undefined
            })
          };
          
          // Send the complete event
          controller.enqueue(encoder.encode(`event: ${completeEvent.event}\ndata: ${completeEvent.data}\n\n`));
          
          // Close the stream
          controller.close();
          
          // Update agent state to idle
          AgentStateService.updateAgentState(
            getAgentTypeEnum(agentType),
            'idle',
            ''
          );
          
          // Update request status
          AgentStateService.updateRequest(requestId, {
            status: 'completed',
            response: finalContent
          });
        },
        
        onHandoff: (sourceAgentName, targetAgentName) => {
          if (!controller) return;
          
          console.log(`Handoff from ${sourceAgentName} to ${targetAgentName} for request ${requestId}`);
          
          // Create a handoff event
          const handoffEvent = {
            event: 'handoff',
            data: JSON.stringify({
              from: sourceAgentName,
              to: targetAgentName
            })
          };
          
          // Send the handoff event
          controller.enqueue(encoder.encode(`event: ${handoffEvent.event}\ndata: ${handoffEvent.data}\n\n`));
          
          // Update agent state
          AgentStateService.updateAgentState(
            getAgentTypeEnum(agentType),
            'working',
            `Handing off to ${targetAgentName}`
          );
        }
      };
      
      // Run the agent with streaming
      await runner.run_streamed(query, callbacks, runConfig);
    } catch (error) {
      console.error(`Unhandled error in agent streaming for ${requestId}:`, error);
      endStreamWithError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  })();
  
  // Set response headers for SSE
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Content-Encoding': 'none',
    'X-Request-ID': requestId,
    ...delegationHeaders // Include any delegation headers that were set
  };
  
  return new Response(stream, { headers });
}

/**
 * Map string agent type to enum
 */
function getAgentTypeEnum(type: string): AgentType {
  switch (type.toLowerCase()) {
    case 'research': return AgentType.RESEARCH;
    case 'report': return AgentType.REPORT;
    case 'triage': return AgentType.TRIAGE;
    case 'judge': return AgentType.JUDGE;
    case 'mimir': return AgentType.MIMIR;
    case 'auto': 
    case 'delegation': 
      return AgentType.DELEGATION;
    default: return AgentType.DELEGATION;
  }
} 

