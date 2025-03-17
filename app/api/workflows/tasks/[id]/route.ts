import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// GET handler to retrieve task status and steps
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const taskId = params.id;
    
    // Fetch task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();
    
    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found', details: taskError },
        { status: 404 }
      );
    }
    
    // Fetch all steps for this task
    const { data: steps, error: stepsError } = await supabase
      .from('task_steps')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (stepsError) {
      return NextResponse.json(
        { error: 'Failed to fetch task steps', details: stepsError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      task,
      steps: steps || []
    });
    
  } catch (error) {
    console.error('Error fetching task details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task details', details: error },
      { status: 500 }
    );
  }
}

// PATCH handler to update task status or add instructions
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const taskId = params.id;
    const body = await request.json();
    const { action, data } = body;
    
    // Verify the task belongs to the user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();
    
    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found', details: taskError },
        { status: 404 }
      );
    }
    
    // Handle different actions
    if (action === 'cancel' || action === 'pause') {
      // Update task status to cancel or pause the workflow
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: action === 'cancel' ? 'cancelled' : 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (updateError) {
        return NextResponse.json(
          { error: `Failed to ${action} task`, details: updateError },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        task: {
          ...task,
          status: action === 'cancel' ? 'cancelled' : 'paused'
        }
      });
    } else if (action === 'resume') {
      // Resume a paused task
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to resume task', details: updateError },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        task: {
          ...task,
          status: 'in_progress'
        }
      });
    } else if (action === 'instruction' && data?.instruction) {
      // Add a new instruction to modify the workflow
      const { error: instructionError } = await supabase
        .from('task_instructions')
        .insert({
          task_id: taskId,
          content: data.instruction,
          applied: false,
          created_at: new Date().toISOString()
        });
      
      if (instructionError) {
        return NextResponse.json(
          { error: 'Failed to add instruction', details: instructionError },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Instruction added successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error },
      { status: 500 }
    );
  }
} 