import { getServerSession } from '@/lib/auth';
import { getVotesByChatId, voteMessage } from '@/lib/db/queries';
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

    const votes = await getVotesByChatId({ id: chatId });

    return NextResponse.json(votes);
  } catch (error) {
    console.error('Error in vote GET API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const {
      chatId,
      messageId,
      type,
    }: { chatId: string; messageId: string; type: 'up' | 'down' } =
      await request.json();

    if (!chatId || !messageId || !type) {
      return NextResponse.json(
        { error: 'messageId and type are required' },
        { status: 400 }
      );
    }

    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await voteMessage({
      chatId,
      messageId,
      type: type,
    });

    return NextResponse.json({ message: 'Message voted successfully' });
  } catch (error) {
    console.error('Error in vote PATCH API:', error);
    return NextResponse.json(
      { error: 'Failed to vote message' },
      { status: 500 }
    );
  }
}


