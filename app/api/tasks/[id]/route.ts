import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { updateAgentTask } from '@/lib/supabase';

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  const resolvedParams = await params;
  const taskId = resolvedParams.id;
  
  if (!taskId) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Fetch the task from the database
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();
    
    if (taskError) {
      return NextResponse.json(
        { error: 'Failed to fetch task', details: taskError },
        { status: 500 }
      );
    }
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      task
    });
    
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task', details: error },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/:id - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated || !userId) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  const resolvedParams = await params;
  const taskId = resolvedParams.id;
  
  try {
    const body = await request.json();
    const { status, result } = body;
    
    // Ensure at least one field is provided
    if (!status && result === undefined) {
      return NextResponse.json(
        { error: 'At least one field (status or result) must be provided' },
        { status: 400 }
      );
    }
    
    // Update the task
    const updateResult = await updateAgentTask(taskId, {
      status,
      result,
      updated_at: new Date().toISOString()
    });
    
    if (updateResult.error) {
      throw new Error(String(updateResult.error));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
} 