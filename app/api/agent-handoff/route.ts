import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { processWithAgents, initializeAgentSDK, processDirectChat } from '@/lib/agents/agentService';

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
    
    // Initialize the OpenAI Agents SDK
    initializeAgentSDK(process.env.OPENAI_API_KEY);
    
    let result;
    
    // Process differently based on the mode
    if (directChatMode) {
      // Direct chat with model (no delegation)
      result = {
        response: await processDirectChat(message, previousMessages, chatId || uuidv4()),
        agent: {
          id: 'direct-chat',
          name: 'GPT-4o',
          type: 'direct',
          icon: '🤖'
        },
        handoffId: uuidv4()
      };
    } else {
      // Process through delegation agent
      result = await processWithAgents(message, chatId || uuidv4());
    }
    
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
        target_agent_id: result.agent.id,
        message,
        response: result.response,
        direct_mode: directChatMode,
        created_at: now
      });
    
    if (handoffError) {
      console.error('Error saving handoff record:', handoffError);
      // Continue anyway as this is just for tracking
    }
    
    // Return the agent response
    return NextResponse.json({
      response: result.response,
      agent: result.agent,
      handoffId
    });
    
  } catch (error) {
    console.error('Unexpected error during agent handoff:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 