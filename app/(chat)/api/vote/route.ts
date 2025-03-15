import { getServerSession } from '@/lib/auth';
import { getVotesByChatId, voteMessage } from '@/lib/supabase/queries';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const votes = await getVotesByChatId({ id: chatId });
      return NextResponse.json(votes || []);
    } catch (dbError: any) {
      console.error('[Vote API] Database error fetching votes:', dbError);
      // Check for specific database errors
      if (dbError.message?.includes('connection') || dbError.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { error: 'Database connection error', details: 'Unable to connect to the database' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch votes', details: dbError.message || 'Unknown database error' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Vote API] Unexpected error in GET endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes', details: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Parse the request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Failed to parse JSON' },
        { status: 400 }
      );
    }

    const {
      chatId,
      messageId,
      type,
    }: { chatId: string; messageId: string; type: 'up' | 'down' } = body;

    if (!chatId || !messageId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'chatId, messageId and type are required' },
        { status: 400 }
      );
    }

    // Validate type value
    if (type !== 'up' && type !== 'down') {
      return NextResponse.json(
        { error: 'Invalid type value', details: "Type must be either 'up' or 'down'" },
        { status: 400 }
      );
    }

    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await voteMessage({
        chatId,
        messageId,
        type: type,
      });

      return NextResponse.json({ message: 'Message voted successfully' });
    } catch (dbError: any) {
      console.error('[Vote API] Database error saving vote:', dbError);
      // Check for specific database errors
      if (dbError.message?.includes('connection') || dbError.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { error: 'Database connection error', details: 'Unable to connect to the database' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to vote message', details: dbError.message || 'Unknown database error' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Vote API] Unexpected error in PATCH endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to vote message', details: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


