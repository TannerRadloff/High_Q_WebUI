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
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    if (workflowsError) {
      console.error('Database error:', workflowsError);
      return NextResponse.json(
        { error: 'Failed to fetch workflows', details: workflowsError },
        { status: 500 }
      );
    }
    
    // Transform workflows to ensure graph is always an object with nodes and edges
    const transformedWorkflows = workflows?.map(workflow => ({
      ...workflow,
      graph: workflow.graph || { nodes: [], edges: [] }
    }));
    
    return NextResponse.json({
      workflows: transformedWorkflows,
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
    const { name, description, nodes = [], edges = [] } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Create a new workflow with graph data
    const { data: workflow, error: createError } = await supabase
      .from('workflows')
      .insert({
        user_id: userId,
        name,
        description,
        graph: { nodes, edges },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Database error:', createError);
      return NextResponse.json(
        { error: 'Failed to create workflow', details: createError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      workflow: {
        ...workflow,
        graph: workflow.graph || { nodes: [], edges: [] }
      }
    });
    
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: error },
      { status: 500 }
    );
  }
} 