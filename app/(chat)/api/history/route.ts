import { getServerSession } from '@/lib/auth';
import { getChatsByUserId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // biome-ignore lint: Forbidden non-null assertion.
    const chats = await getChatsByUserId({ id: session.user.id });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}


