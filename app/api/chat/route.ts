import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { saveChat } from '@/lib/db/queries';
import { z } from 'zod';

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ChatSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid UUID format'),
  title: z.string().min(1, 'Title is required'),
  visibility: z.enum(['private', 'public']).optional(),
});

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
    if (!body) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate request body
    const result = ChatSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors
        .map(err => err.message)
        .join(', ');
      
      return new NextResponse(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { id, title, visibility } = result.data;

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
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create chat'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 