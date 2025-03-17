import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { getServerSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * GET /api/agent-traces/:id
 * Retrieves a specific agent trace by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
        steps: {
          orderBy: (fields) => fields.timestamp,
        },
      },
    });
    
    if (!trace) {
      return NextResponse.json(
        { error: 'Trace not found' },
        { status: 404 }
      );
    }
    
    // Check if the trace belongs to the user or is public
    if (trace.userId && trace.userId !== session.user.id) {
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