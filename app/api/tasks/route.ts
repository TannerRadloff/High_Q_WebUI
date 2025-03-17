import { NextResponse } from 'next/server';
import { createAgentTask, getAgentTasks } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// GET /api/tasks - Get all tasks for the current user
// Can filter by query_id using ?query_id=xxx
export async function GET(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    // Get tasks for this user
    const result = await getAgentTasks(userId);
    
    if (!result.success) {
      throw new Error(result.error as any);
    }
    
    // Filter by query_id if provided
    const url = new URL(request.url);
    const queryId = url.searchParams.get('query_id');
    
    let tasks = result.data || [];
    if (queryId) {
      tasks = tasks.filter(task => task.query_id === queryId);
    }
    
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { query_id, description, agent, status = 'queued', parent_task_id } = body;
    
    if (!description || !agent) {
      return NextResponse.json(
        { error: 'Description and agent are required fields' },
        { status: 400 }
      );
    }
    
    // Create the task
    const result = await createAgentTask({
      user_id: userId,
      query_id: query_id || undefined,
      description,
      agent,
      status,
      parent_task_id,
    });
    
    if (!result.success) {
      throw new Error(result.error as any);
    }
    
    return NextResponse.json({ success: true, taskId: result.id });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 