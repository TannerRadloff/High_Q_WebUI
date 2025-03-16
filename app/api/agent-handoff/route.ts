import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { processWithAgents, initializeAgentSDK, processDirectChat } from '@/lib/agents/agentService';
import { AgentType, determineAgentType } from '@/lib/agents/agentService';
import { checkAuth } from '@/lib/auth-utils';
import { getAgentById } from '@/lib/agents/agentRegistry';
import { createAgentTrace, addTraceStep, completeAgentTrace } from '@/lib/agents/agentTraceService';

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
      }
    );

    // Initialize the OpenAI Agents SDK
    initializeAgentSDK(process.env.OPENAI_API_KEY);
    
    // Record the start time for performance measurement
    const startTime = Date.now();
    
    let result;
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
      result = await processDirectChat(message, previousMessages);
    } else {
      // Process through delegation agent or specified agent
      result = await processWithAgents(message, chatId || uuidv4());
      
      // If the message was delegated, add it to the trace
      if (result.agent && result.agent.id !== (targetAgentId || 'MimirAgent')) {
        addTraceStep(
          trace.id,
          'handoff',
          `Delegated to ${result.agent.name}`,
          {
            from: targetAgentId || 'MimirAgent',
            to: result.agent.id,
            reason: 'Delegation based on message content analysis'
          }
        );
        
        delegationReason = 'Delegation based on message content analysis';
      }
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
      }
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
        { error: handoffError }
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
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 