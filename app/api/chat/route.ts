import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { saveChat } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.id || !body.title) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { id, title, visibility } = body;

    // Create the chat in the database
    await saveChat({
      id,
      userId: session.user.id,
      title,
    });

    return new NextResponse(
      JSON.stringify({ success: true, id }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating chat:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create chat' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 