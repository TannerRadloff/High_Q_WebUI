import { NextResponse } from 'next/server';
import { getUserTasks, createTask } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// GET /api/tasks - Get all tasks for the current user
// Can filter by workflow_id using ?workflow_id=xxx
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
    const result = await getUserTasks(userId);
    
    if (!result.data) {
      throw new Error(result.error as any);
    }
    
    // Filter by workflow_id if provided
    const url = new URL(request.url);
    const workflowId = url.searchParams.get('workflow_id');
    
    let tasks = result.data || [];
    if (workflowId) {
      tasks = tasks.filter(task => task.workflow_id === workflowId);
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
    const { workflow_id, description, agent, status = 'queued', parent_task_id } = body;
    
    if (!description || !agent) {
      return NextResponse.json(
        { error: 'Description and agent are required fields' },
        { status: 400 }
      );
    }
    
    // Create the task
    const result = await createTask({
      user_id: userId,
      workflow_id: workflow_id || undefined,
      description,
      agent,
      status,
      parent_task_id,
    });
    
    if (!result.data) {
      throw new Error(result.error as any);
    }
    
    return NextResponse.json({ 
      success: true, 
      task: result.data 
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 