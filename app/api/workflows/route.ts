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
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Fetch workflows from the database
    const { data: workflows, error: workflowsError, count } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    if (workflowsError) {
      return NextResponse.json(
        { error: 'Failed to fetch workflows', details: workflowsError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      workflows,
      count,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: error },
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
    const { name, description, nodes, edges } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json(
        { error: 'Workflow must contain at least one node' },
        { status: 400 }
      );
    }
    
    // Create a new workflow
    const { data: workflow, error: createError } = await supabase
      .from('workflows')
      .insert({
        name,
        description,
        nodes,
        edges,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create workflow', details: createError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      workflow
    });
    
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: error },
      { status: 500 }
    );
  }
} 