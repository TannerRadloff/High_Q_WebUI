import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const workflowId = url.searchParams.get('workflowId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Build the query
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    // Add filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }
    
    // Execute the query
    const { data: tasks, error: tasksError, count } = await query;
    
    if (tasksError) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: tasksError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      tasks,
      count,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Verify authentication
  const { authenticated, userId, error: authError } = await verifyAuth();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Authentication required', details: authError },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { title, description, workflowId, agent } = body;
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Create a new task
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        workflow_id: workflowId,
        agent,
        status: 'queued',
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create task', details: createError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      task
    });
    
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error },
      { status: 500 }
    );
  }
} 