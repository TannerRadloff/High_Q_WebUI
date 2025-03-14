import { getServerSession } from '@/lib/auth';
import { getChatsByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

// Simple mock data for debugging purposes - will be used if database call fails
const MOCK_CHATS = [
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
  console.log('History API: Request received');
  
  try {
    // Get the user session
    const session = await getServerSession();
    
    // Detailed session logging for debugging
    console.log('History API: Session check', {
      hasSession: !!session,
      hasUser: !!(session?.user),
      userId: session?.user?.id ? `${session.user.id.substring(0, 5)}...` : null,
      email: session?.user?.email ? `${session.user.email.split('@')[0]}@...` : null,
      timestamp: new Date().toISOString()
    });

    // No session check - for debugging, return mock data
    if (!session || !session.user) {
      console.log('History API: No authenticated user session found');
      
      // For development only - allow unauthenticated access with mock data
      if (process.env.NODE_ENV === 'development') {
        console.log('History API: Development mode - returning mock data for unauthenticated request');
        return NextResponse.json(MOCK_CHATS);
      }
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // biome-ignore lint: Forbidden non-null assertion.
    const userId = session.user.id;
    console.log(`History API: Fetching chats for user ${userId.substring(0, 5)}...`);
    
    try {
      const chats = await getChatsByUserId({ id: userId });
      console.log(`History API: Successfully fetched ${chats.length} chats`);
      
      // Return empty array instead of null/undefined to avoid client-side errors
      return NextResponse.json(chats || []);
    } catch (dbError: any) {
      console.error('History API: Database error:', dbError);
      
      // For development only - return mock data on database error
      if (process.env.NODE_ENV === 'development') {
        console.log('History API: Development mode - returning mock data due to database error');
        return NextResponse.json(MOCK_CHATS);
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch chat history from database', details: dbError?.message || 'Unknown database error' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('History API: Unexpected error:', error);
    
    // For development only - return mock data on any error
    if (process.env.NODE_ENV === 'development') {
      console.log('History API: Development mode - returning mock data due to unexpected error');
      return NextResponse.json(MOCK_CHATS);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch chat history', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


