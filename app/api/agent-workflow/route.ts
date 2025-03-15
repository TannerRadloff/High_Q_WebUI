import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { Agent, Connection } from '@/components/agents-dashboard/types';

/**
 * GET /api/agent-workflow
 * Retrieves all agent workflows for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from the session
    const supabase = await getSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Query workflows for this user
    const { data: workflows, error } = await supabase
      .from('agent_workflow')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        is_active,
        entry_point_agent_id
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-workflow
 * Creates a new agent workflow
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from the session
    const supabase = await getSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse the request body
    const body = await request.json();
    const { name, description, agents, connections, entryPointAgentId } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }
    
    // Create a new workflow
    const workflowId = uuidv4();
    const now = new Date().toISOString();
    
    // Insert the workflow record
    const { error: workflowError } = await supabase
      .from('agent_workflow')
      .insert({
        id: workflowId,
        user_id: userId,
        name,
        description: description || '',
        created_at: now,
        updated_at: now,
        is_active: true,
        entry_point_agent_id: entryPointAgentId || ''
      });
    
    if (workflowError) {
      console.error('Error creating workflow:', workflowError);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }
    
    // Insert the workflow version with agents and connections
    const versionId = uuidv4();
    
    const { error: versionError } = await supabase
      .from('agent_workflow_version')
      .insert({
        id: versionId,
        workflow_id: workflowId,
        version: 1, // First version
        agents: agents || [],
        connections: connections || [],
        created_at: now
      });
    
    if (versionError) {
      console.error('Error creating workflow version:', versionError);
      // Attempt to rollback the workflow creation
      await supabase
        .from('agent_workflow')
        .delete()
        .eq('id', workflowId);
        
      return NextResponse.json(
        { error: 'Failed to save workflow data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      workflowId,
      message: 'Workflow created successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 