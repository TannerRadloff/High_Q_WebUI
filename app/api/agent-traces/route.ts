import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { getServerSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * GET /api/agent-traces
 * Retrieves all agent traces for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');
    
    let traces;
    
    if (chatId) {
      // Get traces for a specific chat
      traces = await db.query.agentTrace.findMany({
        where: (fields) => chatId ? eq(fields.chatId, chatId) : undefined,
        orderBy: (fields) => fields.startTime,
        desc: true,
        with: {
          steps: {
            orderBy: (fields) => fields.timestamp,
          },
        },
      });
    } else {
      // Get all traces for the user
      traces = await db.query.agentTrace.findMany({
        where: (fields) => eq(fields.userId, session.user.id),
        orderBy: (fields) => fields.startTime,
        desc: true,
        limit: 20,
      });
    }
    
    return NextResponse.json({ traces });
  } catch (error) {
    console.error('Error retrieving agent traces:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve agent traces' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-traces/:id
 * Retrieves a specific agent trace by ID
 */
export async function GET_TRACE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    const trace = await db.query.agentTrace.findFirst({
      where: (fields) => eq(fields.id, id),
      with: {
        steps: true,
      },
    });
    
    if (!trace) {
      return NextResponse.json(
        { error: 'Trace not found' },
        { status: 404 }
      );
    }
    
    // Check if the trace belongs to the user
    if (trace.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ trace });
  } catch (error) {
    console.error('Error retrieving agent trace:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve agent trace' },
      { status: 500 }
    );
  }
} 