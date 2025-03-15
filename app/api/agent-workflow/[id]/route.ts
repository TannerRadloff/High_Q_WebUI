import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/agent-workflow/[id]
 * Retrieves a specific agent workflow with its latest version data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get the workflow metadata
    const { data: workflow, error: workflowError } = await supabase
      .from('agent_workflow')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (workflowError) {
      if (workflowError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching workflow:', workflowError);
      return NextResponse.json(
        { error: 'Failed to fetch workflow' },
        { status: 500 }
      );
    }
    
    // Get the latest version of the workflow
    const { data: versions, error: versionsError } = await supabase
      .from('agent_workflow_version')
      .select('*')
      .eq('workflow_id', id)
      .order('version', { ascending: false })
      .limit(1);
    
    if (versionsError) {
      console.error('Error fetching workflow version:', versionsError);
      return NextResponse.json(
        { error: 'Failed to fetch workflow data' },
        { status: 500 }
      );
    }
    
    const version = versions && versions.length > 0 ? versions[0] : null;
    
    // Combine workflow metadata with version data
    return NextResponse.json({
      ...workflow,
      agents: version?.agents || [],
      connections: version?.connections || [],
      version: version?.version || 1
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agent-workflow/[id]
 * Updates an existing agent workflow, creating a new version
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Check if the workflow exists and belongs to this user
    const { data: existingWorkflow, error: queryError } = await supabase
      .from('agent_workflow')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (queryError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied' },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { name, description, agents, connections, entryPointAgentId } = body;
    
    // Update the workflow metadata
    const now = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('agent_workflow')
      .update({
        name: name,
        description: description || '',
        updated_at: now,
        entry_point_agent_id: entryPointAgentId || ''
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating workflow:', updateError);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }
    
    // Get the latest version number
    const { data: latestVersion, error: versionQueryError } = await supabase
      .from('agent_workflow_version')
      .select('version')
      .eq('workflow_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    if (versionQueryError && versionQueryError.code !== 'PGRST116') {
      console.error('Error querying latest version:', versionQueryError);
      return NextResponse.json(
        { error: 'Failed to determine version number' },
        { status: 500 }
      );
    }
    
    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;
    
    // Create a new version
    const versionId = uuidv4();
    
    const { error: versionError } = await supabase
      .from('agent_workflow_version')
      .insert({
        id: versionId,
        workflow_id: id,
        version: nextVersion,
        agents: agents || [],
        connections: connections || [],
        created_at: now
      });
    
    if (versionError) {
      console.error('Error creating workflow version:', versionError);
      return NextResponse.json(
        { error: 'Failed to save workflow data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      workflowId: id,
      version: nextVersion,
      message: 'Workflow updated successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-workflow/[id]
 * Deletes an agent workflow and all its versions
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Check if the workflow exists and belongs to this user
    const { data: existingWorkflow, error: queryError } = await supabase
      .from('agent_workflow')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (queryError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete all versions of this workflow first
    const { error: versionDeleteError } = await supabase
      .from('agent_workflow_version')
      .delete()
      .eq('workflow_id', id);
    
    if (versionDeleteError) {
      console.error('Error deleting workflow versions:', versionDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete workflow data' },
        { status: 500 }
      );
    }
    
    // Delete the workflow itself
    const { error: workflowDeleteError } = await supabase
      .from('agent_workflow')
      .delete()
      .eq('id', id);
    
    if (workflowDeleteError) {
      console.error('Error deleting workflow:', workflowDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 