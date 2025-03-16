import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { processWithAgents, initializeAgentSDK, processDirectChat } from '@/lib/agents/agentService';
import { createAgentTrace, addTraceStep, completeAgentTrace } from '@/lib/agents/agentTraceService';

// Define the agent result type to fix type errors
type AgentResult = {
  response: string;
  agent?: {
    id: string;
    name: string;
    type: string;
    icon: string;
  };
  handoffId?: string;
  traceId?: string;
  handoffPath?: string[];
  handoffData?: any;
};

/**
 * POST /api/agent-handoff
 * Handles agent handoffs and delegation using the OpenAI Agents SDK
 * Or direct chat with a model when directChatMode is enabled
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from the session
    const supabase = await getSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { 
      message, 
      sourceAgentId,
      targetAgentId,
      chatId,
      previousMessages = [],
      directChatMode = false
    } = body;
      
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add it to your .env.local file.' },
        { status: 500 }
      );
    }

    // Create a trace for this operation
    const trace = createAgentTrace(
      targetAgentId || sourceAgentId || 'delegation-agent',
      targetAgentId ? 'Target Agent' : sourceAgentId ? 'Source Agent' : 'Delegation Agent',
      '🤖',
      message
    );
    
    // Add initial trace step
    addTraceStep(
      trace.id,
      'thought',
      `Received handoff request${sourceAgentId ? ` from ${sourceAgentId}` : ''}${targetAgentId ? ` to ${targetAgentId}` : ''}`,
      { 
        messageLength: message.length,
        sourceAgentId,
        targetAgentId,
        chatId,
        previousMessagesCount: previousMessages.length 
      },
      'completed'
    );

    try {
      // Initialize the OpenAI Agents SDK
      initializeAgentSDK(process.env.OPENAI_API_KEY);
      
      // Record the start time for performance measurement
      const startTime = Date.now();
      
      let result: AgentResult;
      let delegationReason = null;
      
      // Add action trace step
      addTraceStep(
        trace.id,
        'action',
        `Processing message with ${directChatMode ? 'direct chat' : targetAgentId ? 'target agent' : 'delegation system'}`,
        {
          mode: directChatMode ? 'direct' : 'delegation',
          targetAgentId: targetAgentId || null
        },
        'in-progress'
      );
      
      // If directChatMode, process directly with the model
      if (directChatMode) {
        const directResult = await processDirectChat(message, previousMessages, chatId || uuidv4());
        // Convert string result to AgentResult format
        if (typeof directResult === 'string') {
          result = {
            response: directResult
          };
        } else {
          result = directResult as AgentResult;
        }
      } else {
        // Process through delegation agent or specified agent
        // Always start with Mimir delegation agent if no specific agent is targeted
        const delegationAgentId = 'MimirAgent';
        const startingAgentId = targetAgentId || delegationAgentId;
        
        // Add trace step for delegation flow
        addTraceStep(
          trace.id,
          'thought',
          `Starting with ${startingAgentId === delegationAgentId ? 'delegation agent (Mimir)' : 'specific agent'}`,
          { startingAgentId },
          'completed'
        );
        
        try {
          // Always use Mimir as the fallback if no specific agent is targeted
          result = await processWithAgents(message, chatId || uuidv4()) as AgentResult;
          
          // If the message was delegated, add it to the trace
          if (result.agent && result.agent.id !== startingAgentId) {
            addTraceStep(
              trace.id,
              'handoff',
              `Delegated to ${result.agent.name}`,
              {
                from: startingAgentId,
                to: result.agent.id,
                reason: 'Delegation based on message content analysis'
              },
              'completed'
            );
            
            delegationReason = 'Delegation based on message content analysis';
          }
        } catch (error) {
          console.error('Error processing with agents:', error);
          
          // Add error trace step
          addTraceStep(
            trace.id,
            'error',
            `Error processing with agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error: String(error) },
            'completed'
          );
          
          // Fallback to Mimir if there's an error with the target agent
          addTraceStep(
            trace.id,
            'thought',
            'Falling back to Mimir delegation agent due to error',
            { error: String(error) },
            'completed'
          );
          
          // Use Mimir as fallback
          result = {
            response: "I apologize, but I encountered an issue processing your request. I'll help you directly instead.",
            agent: {
              id: 'MimirAgent',
              name: 'Mimir',
              type: 'delegation',
              icon: '👨‍💼'
            }
          };
        }
      }
      
      // Ensure we have a final result to return to the user
      if (!result.response) {
        addTraceStep(
          trace.id,
          'error',
          'No response received from agent',
          { agentId: result.agent?.id || 'unknown' },
          'completed'
        );
        
        // Provide a fallback response
        result.response = "I'm sorry, but I couldn't process your request properly. Please try again.";
      }
      
      // Record the processing time
      const processingTime = Date.now() - startTime;
      
      // Add observation trace step
      addTraceStep(
        trace.id,
        'observation',
        `Message processed in ${processingTime}ms, response length: ${result.response.length} characters`,
        {
          processingTime,
          responseLength: result.response.length
        },
        'completed'
      );
      
      // Complete the trace
      completeAgentTrace(
        trace.id,
        true,
        `Successfully processed with ${result.agent?.name || 'direct chat'}`
      );

      // Save the handoff record for tracking
      const handoffId = result.handoffId || uuidv4();
      const now = new Date().toISOString();
      
      const { error: handoffError } = await supabase
        .from('agent_handoff')
        .insert({
          id: handoffId,
          user_id: session.user.id,
          chat_id: chatId || uuidv4(),
          source_agent_id: sourceAgentId || null,
          target_agent_id: result.agent?.id,
          message,
          response: result.response,
          direct_mode: directChatMode,
          created_at: now,
          trace_id: trace.id  // Store trace ID for future reference
        });
      
      if (handoffError) {
        console.error('Error saving handoff record:', handoffError);
        
        addTraceStep(
          trace.id,
          'error',
          `Error saving handoff record: ${handoffError.message}`,
          { error: handoffError },
          'completed'
        );
        
        // Continue anyway as this is just for tracking
      }
      
      // Add headers with trace info
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('x-trace-id', trace.id);
      
      if (result.agent) {
        headers.set('x-delegation-status', JSON.stringify({
          agentName: result.agent.name,
          agentId: result.agent.id,
          reasoning: delegationReason
        }));
      }
      
      // Return the agent response
      return new NextResponse(
        JSON.stringify({
          response: result.response,
          agent: result.agent,
          handoffId,
          traceId: trace.id
        }),
        { 
          status: 200,
          headers
        }
      );
    } catch (error) {
      console.error('Unexpected error during agent handoff:', error);
      
      // Complete the trace with error
      addTraceStep(
        trace.id,
        'error',
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) },
        'completed'
      );
      
      completeAgentTrace(
        trace.id,
        false,
        `Failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      return NextResponse.json(
        { error: 'An unexpected error occurred while processing your request.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error during agent handoff:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
} 