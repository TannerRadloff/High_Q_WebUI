import { getServerSession } from '@/lib/auth';
import { getChatsByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the user session
    const session = await getServerSession();
    
    // Log session details for debugging (without sensitive info)
    console.log('History API: Session check', {
      hasSession: !!session,
      hasUser: !!(session?.user),
      userId: session?.user?.id ? `${session.user.id.substring(0, 5)}...` : null,
      email: session?.user?.email ? `${session.user.email.split('@')[0]}@...` : null,
    });

    if (!session || !session.user) {
      console.log('History API: No authenticated user session found');
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
      return NextResponse.json(
        { error: 'Failed to fetch chat history from database', details: dbError?.message || 'Unknown database error' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('History API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


