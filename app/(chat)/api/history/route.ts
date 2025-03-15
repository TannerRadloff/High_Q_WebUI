import { getServerSession } from '@/lib/auth';
import { getChatsByUserId } from '@/lib/supabase/queries';
import { NextResponse } from 'next/server';
import type { Chat } from '@/lib/supabase/queries';

// Simple mock data for debugging purposes - will be used if database call fails
const MOCK_CHATS: Chat[] = [
  {
    id: 'debug-chat-1',
    createdAt: new Date(),
    title: '[Debug] Test Chat 1',
    userId: 'debug-user',
    visibility: 'private'
  },
  {
    id: 'debug-chat-2',
    createdAt: new Date(), 
    title: '[Debug] Test Chat 2',
    userId: 'debug-user',
    visibility: 'private'
  }
];

export async function GET() {
  console.log('[History API] Request received');
  
  try {
    // Get the user session
    const session = await getServerSession();
    
    // Detailed session logging for debugging
    console.log('[History API] Session check', {
      hasSession: !!session,
      hasUser: !!(session?.user),
      userId: session?.user?.id ? `${session.user.id.substring(0, 5)}...` : null,
      email: session?.user?.email ? `${session.user.email.split('@')[0]}@...` : null,
      timestamp: new Date().toISOString()
    });

    // No session check - for debugging, return mock data
    if (!session || !session.user) {
      console.log('[History API] No authenticated user session found');
      
      // For development only - allow unauthenticated access with mock data
      if (process.env.NODE_ENV === 'development') {
        console.log('[History API] Development mode - returning mock data for unauthenticated request');
        return NextResponse.json(MOCK_CHATS);
      }
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`[History API] Fetching chats for user ${userId.substring(0, 5)}...`);
    
    try {
      // Set a timeout for the database query to prevent long-running requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });
      
      // Create a promise for the actual database query
      const queryPromise = getChatsByUserId({ id: userId });
      
      // Race the timeout against the actual query
      const chats = await Promise.race([queryPromise, timeoutPromise]) as Array<Chat>;
      
      console.log(`[History API] Successfully fetched ${chats.length} chats`);
      
      // Return empty array instead of null/undefined to avoid client-side errors
      return NextResponse.json(chats || []);
    } catch (dbError: any) {
      console.error('[History API] Database error:', dbError);
      
      // Enhanced error diagnosis for clearer debugging
      const errorDetails = {
        message: dbError.message || 'Unknown error',
        code: dbError.code,
        name: dbError.name || 'Unknown',
        stack: dbError.stack ? dbError.stack.split('\n')[0] : null,
        isTimeout: dbError.message?.includes('timeout')
      };
      
      console.error('[History API] Error details:', errorDetails);
      
      // Check for connection-related errors
      if (
        dbError.message?.includes('connection') || 
        dbError.message?.includes('timeout') || 
        dbError.code === 'ECONNREFUSED' ||
        dbError.code === '57P01' || // database connection timeout
        dbError.code === '08006'    // connection terminated
      ) {
        return NextResponse.json(
          { 
            error: 'Database connection error', 
            details: 'Unable to connect to the database. Please try again later.'
          },
          { status: 503 }
        );
      }
      
      // For development only - return mock data on database error
      if (process.env.NODE_ENV === 'development') {
        console.log('[History API] Development mode - returning mock data due to database error');
        return NextResponse.json(MOCK_CHATS);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch chat history from database', 
          details: dbError?.message || 'Unknown database error',
          errorCode: dbError?.code
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[History API] Unexpected error:', error);
    
    // For development only - return mock data on any error
    if (process.env.NODE_ENV === 'development') {
      console.log('[History API] Development mode - returning mock data due to unexpected error');
      return NextResponse.json(MOCK_CHATS);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch chat history', 
        details: error?.message || 'Unknown error',
        errorCode: error?.code
      },
      { status: 500 }
    );
  }
}


