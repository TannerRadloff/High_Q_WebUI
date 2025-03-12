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

// Define the AgentRequest type with properly typed properties
type AgentRequest = {
  id: string;
  timestamp: string;
  query: string;
  agentType: AgentType;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  response?: string; // Using response instead of result for consistency
  error?: string;
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
      metadata: {
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
      status: 'pending'
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
      
      // Run the agent using the runner
      const runResult = await runner.run(query, runConfig);
      
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
  let lastResponseTime = Date.now();
  let heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Create a stream
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      
      // Start a heartbeat to prevent timeouts
      heartbeatInterval = setInterval(() => {
        const timeElapsed = Date.now() - lastResponseTime;
        
        // If no response for a while, send a heartbeat
        if (timeElapsed > HEARTBEAT_INTERVAL / 2) {
          try {
            controller?.enqueue(encoder.encode('data: {"type": "heartbeat"}\n\n'));
          } catch (err) {
            console.error('Error sending heartbeat:', err);
          }
        }
        
        // If no response for too long, timeout
        if (timeElapsed > REQUEST_TIMEOUT) {
          try {
            controller?.enqueue(encoder.encode('data: {"type": "error", "value": "Request timed out"}\n\n'));
            controller?.close();
          } catch (err) {
            console.error('Error closing stream on timeout:', err);
          } finally {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          }
        }
      }, HEARTBEAT_INTERVAL);
    },
    
    cancel() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    }
  });
  
  // Update request status
  AgentStateService.updateRequest(requestId, { status: 'in-progress' });
  
  // Create a runner with the appropriate agent based on the requested type
  const runner = createRunnerForAgentType(agentType);
  
  // Create streaming callbacks
  const callbacks: StreamRunCallbacks = {
    onStart: () => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode('data: {"type": "start"}\n\n'));
      } catch (err) {
        console.error('Error sending start event:', err);
      }
    },
    
    onToken: (token: string) => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode(`data: {"type": "token", "value": ${JSON.stringify(token)}}\n\n`));
      } catch (err) {
        console.error('Error sending token:', err);
      }
    },
    
    onTriageComplete: (result: TriageResult) => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode(`data: {"type": "triage", "value": ${JSON.stringify(result)}}\n\n`));
      } catch (err) {
        console.error('Error sending triage result:', err);
      }
    },
    
    onResearchStart: () => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode('data: {"type": "research_start"}\n\n'));
      } catch (err) {
        console.error('Error sending research start event:', err);
      }
    },
    
    onResearchComplete: (researchData: string) => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode(`data: {"type": "research_complete", "value": ${JSON.stringify(researchData)}}\n\n`));
      } catch (err) {
        console.error('Error sending research complete event:', err);
      }
    },
    
    onReportStart: () => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode('data: {"type": "report_start"}\n\n'));
      } catch (err) {
        console.error('Error sending report start event:', err);
      }
    },
    
    onHandoff: (from: string, to: string) => {
      lastResponseTime = Date.now();
      try {
        controller?.enqueue(encoder.encode(`data: {"type": "handoff", "from": ${JSON.stringify(from)}, "to": ${JSON.stringify(to)}}\n\n`));
      } catch (err) {
        console.error('Error sending handoff event:', err);
      }
    },
    
    onComplete: (finalResponse: AgentResponse) => {
      lastResponseTime = Date.now();
      try {
        // Extract content from the agent response
        const content = finalResponse.content;
        
        controller?.enqueue(encoder.encode(`data: {"type": "complete", "value": ${JSON.stringify(content)}}\n\n`));
        controller?.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller?.close();
        
        // Update request status
        AgentStateService.updateRequest(requestId, { 
          status: 'completed',
          response: content // Using response instead of result
        });
        
        // Update agent state to idle
        AgentStateService.updateAgentState(
          getAgentTypeEnum(agentType),
          'idle',
          ''
        );
      } catch (err) {
        console.error('Error sending complete event:', err);
      } finally {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
      }
    },
    
    onError: (error: Error) => {
      lastResponseTime = Date.now();
      console.error('Streaming error:', error);
      
      try {
        controller?.enqueue(encoder.encode(`data: {"type": "error", "value": ${JSON.stringify(error.message)}}\n\n`));
        controller?.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller?.close();
        
        // Update request status
        AgentStateService.updateRequest(requestId, { 
          status: 'failed',
          error: error.message
        });
        
        // Update agent state to idle
        AgentStateService.updateAgentState(
          getAgentTypeEnum(agentType),
          'idle',
          ''
        );
      } catch (err) {
        console.error('Error sending error event:', err);
      } finally {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
      }
    }
  };
  
  // Start the streaming run process
  // We do this in a separate task to not block the response
  Promise.resolve().then(async () => {
    try {
      await runner.streamRun(query, callbacks, runConfig);
    } catch (error) {
      console.error('Error starting agent stream:', error);
      
      try {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error starting agent stream';
        controller?.enqueue(encoder.encode(`data: {"type": "error", "value": ${JSON.stringify(errorMessage)}}\n\n`));
        controller?.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller?.close();
        
        // Update request status
        AgentStateService.updateRequest(requestId, { 
          status: 'failed',
          error: errorMessage
        });
        
        // Update agent state to idle
        AgentStateService.updateAgentState(
          getAgentTypeEnum(agentType),
          'idle',
          ''
        );
      } catch (err) {
        console.error('Error sending stream error:', err);
      } finally {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
      }
    }
  });
  
  // Return the response with the stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    }
  });
}

/**
 * Convert string agent type to enum
 */
function getAgentTypeEnum(agentType: string): AgentType {
  switch (agentType) {
    case 'triage':
      return AgentType.TRIAGE;
    case 'research':
      return AgentType.RESEARCH;
    case 'report':
      return AgentType.REPORT;
    case 'delegation':
      return AgentType.DELEGATION;
    default:
      return AgentType.DELEGATION;
  }
} 