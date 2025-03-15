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

// Structured logger function
function logEvent(traceId: string, eventType: string, details: Record<string, any>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    traceId,
    event: eventType,
    ...details
  }));
}

export async function GET() {
  const traceId = Math.random().toString(36).substring(2, 10);
  const startTime = performance.now();
  
  logEvent(traceId, 'HISTORY_API_REQUEST', {
    message: 'History API request received',
    requestTime: new Date().toISOString()
  });
  
  try {
    // Get the user session
    const sessionStart = performance.now();
    const session = await getServerSession();
    const sessionDuration = performance.now() - sessionStart;
    
    // Detailed session logging for debugging
    logEvent(traceId, 'SESSION_CHECK', {
      hasSession: !!session,
      hasUser: !!(session?.user),
      userId: session?.user?.id ? `${session.user.id.substring(0, 5)}...` : null,
      email: session?.user?.email ? `${session.user.email.split('@')[0]}@...` : null,
      duration: sessionDuration.toFixed(2),
      timestamp: new Date().toISOString()
    });

    // No session check - for debugging, return mock data
    if (!session || !session.user) {
      logEvent(traceId, 'NO_SESSION', {
        message: 'No authenticated user session found',
        isDevelopment: process.env.NODE_ENV === 'development'
      });
      
      // For development only - allow unauthenticated access with mock data
      if (process.env.NODE_ENV === 'development') {
        logEvent(traceId, 'MOCK_DATA_RETURN', {
          message: 'Development mode - returning mock data for unauthenticated request',
          mockDataCount: MOCK_CHATS.length
        });
        return NextResponse.json(MOCK_CHATS);
      }
      
      logEvent(traceId, 'UNAUTHORIZED', {
        message: 'Returning 401 Unauthorized',
        responseTime: (performance.now() - startTime).toFixed(2)
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    logEvent(traceId, 'FETCH_CHATS', {
      message: `Fetching chats for user`,
      userId: userId.substring(0, 5),
      timestamp: new Date().toISOString()
    });
    
    try {
      // Set a timeout for the database query to prevent long-running requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          logEvent(traceId, 'QUERY_TIMEOUT', {
            message: 'Database query timed out after 8 seconds',
            userId: userId.substring(0, 5)
          });
          reject(new Error('Database query timeout'));
        }, 8000); // Increased from 5s to 8s to match the client timeout
      });
      
      // Create a promise for the actual database query
      logEvent(traceId, 'DB_QUERY_START', {
        message: 'Starting database query',
        timestamp: new Date().toISOString()
      });
      
      const queryStart = performance.now();
      const queryPromise = getChatsByUserId({ id: userId });
      
      // Race the timeout against the actual query
      const chats = await Promise.race([queryPromise, timeoutPromise]) as Array<Chat>;
      const queryDuration = performance.now() - queryStart;
      
      // Data validation
      const isValidData = Array.isArray(chats);
      if (!isValidData) {
        logEvent(traceId, 'DATA_VALIDATION_ERROR', {
          message: 'Returned data is not an array',
          dataType: typeof chats,
          userId: userId.substring(0, 5)
        });
      }
      
      logEvent(traceId, 'QUERY_COMPLETE', {
        message: `Successfully fetched chats`,
        count: chats?.length || 0,
        duration: queryDuration.toFixed(2),
        isValidArray: isValidData,
        isEmpty: isValidData && chats.length === 0,
        userId: userId.substring(0, 5)
      });
      
      // Return empty array instead of null/undefined to avoid client-side errors
      const totalDuration = performance.now() - startTime;
      logEvent(traceId, 'API_RESPONSE', {
        message: 'Sending successful response',
        status: 200,
        dataCount: chats?.length || 0,
        totalDuration: totalDuration.toFixed(2),
        userId: userId.substring(0, 5)
      });
      
      return NextResponse.json(chats || []);
    } catch (dbError: any) {
      const errorDuration = performance.now() - startTime;
      
      // Enhanced error diagnosis for clearer debugging
      const errorDetails = {
        message: dbError.message || 'Unknown error',
        code: dbError.code,
        name: dbError.name || 'Unknown',
        stack: dbError.stack ? dbError.stack.split('\n')[0] : null,
        isTimeout: dbError.message?.includes('timeout')
      };
      
      logEvent(traceId, 'DATABASE_ERROR', {
        ...errorDetails,
        duration: errorDuration.toFixed(2),
        userId: userId.substring(0, 5)
      });
      
      // Check for connection-related errors
      const isConnectionError = 
        dbError.message?.includes('connection') || 
        dbError.message?.includes('timeout') || 
        dbError.code === 'ECONNREFUSED' ||
        dbError.code === '57P01' || // database connection timeout
        dbError.code === '08006';   // connection terminated
      
      if (isConnectionError) {
        logEvent(traceId, 'CONNECTION_ERROR', {
          message: 'Database connection error',
          error: errorDetails,
          status: 503,
          duration: errorDuration.toFixed(2),
          userId: userId.substring(0, 5)
        });
        
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
        logEvent(traceId, 'DEV_MOCK_DATA', {
          message: 'Development mode - returning mock data due to database error',
          error: errorDetails,
          mockCount: MOCK_CHATS.length,
          userId: userId.substring(0, 5)
        });
        
        return NextResponse.json(MOCK_CHATS);
      }
      
      logEvent(traceId, 'DB_ERROR_RESPONSE', {
        message: 'Returning database error response',
        error: errorDetails,
        status: 500,
        duration: errorDuration.toFixed(2),
        userId: userId.substring(0, 5)
      });
      
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
    const errorDuration = performance.now() - startTime;
    
    logEvent(traceId, 'UNEXPECTED_ERROR', {
      message: 'Unexpected error in history API',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0]
      } : String(error),
      duration: errorDuration.toFixed(2)
    });
    
    // For development only - return mock data on any error
    if (process.env.NODE_ENV === 'development') {
      logEvent(traceId, 'DEV_ERROR_MOCK_DATA', {
        message: 'Development mode - returning mock data due to unexpected error',
        mockCount: MOCK_CHATS.length
      });
      
      return NextResponse.json(MOCK_CHATS);
    }
    
    logEvent(traceId, 'ERROR_RESPONSE', {
      message: 'Returning error response',
      status: 500,
      duration: errorDuration.toFixed(2)
    });
    
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


