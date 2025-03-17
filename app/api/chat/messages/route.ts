import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { saveChatMessage, getChatMessages } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// GET /api/chat/messages?session_id=xxx
export async function GET(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id parameter is required' },
        { status: 400 }
      );
    }
    
    const result = await getChatMessages(sessionId);
    
    if (!result.data) {
      throw new Error(result.error as any);
    }
    
    return NextResponse.json({ messages: result.data });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages
export async function POST(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { content, role, session_id, task_id } = body;
    
    if (!content || !role || !session_id) {
      return NextResponse.json(
        { error: 'Content, role, and session_id are required fields' },
        { status: 400 }
      );
    }
    
    // Save the chat message
    const result = await saveChatMessage({
      user_id: userId,
      content,
      role,
      session_id,
      task_id: task_id || undefined
    });
    
    if (!result.data) {
      throw new Error(result.error as any);
    }
    
    return NextResponse.json({
      success: true,
      message: result.data
    });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Failed to save chat message' },
      { status: 500 }
    );
  }
} 