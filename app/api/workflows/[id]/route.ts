import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

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
  
  const workflowId = params.id;
  
  if (!workflowId) {
    return NextResponse.json(
      { error: 'Workflow ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Fetch the workflow from the database
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();
    
    if (workflowError) {
      return NextResponse.json(
        { error: 'Failed to fetch workflow', details: workflowError },
        { status: 500 }
      );
    }
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      workflow
    });
    
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow', details: error },
      { status: 500 }
    );
  }
}

export async function PUT(
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
  
  const workflowId = params.id;
  
  if (!workflowId) {
    return NextResponse.json(
      { error: 'Workflow ID is required' },
      { status: 400 }
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
    
    // Check if the workflow exists and belongs to the user
    const { data: existingWorkflow, error: checkError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied', details: checkError },
        { status: 404 }
      );
    }
    
    // Update the workflow
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update({
        name,
        description,
        nodes,
        edges,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update workflow', details: updateError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      workflow: updatedWorkflow
    });
    
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow', details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
  
  const workflowId = params.id;
  
  if (!workflowId) {
    return NextResponse.json(
      { error: 'Workflow ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Check if the workflow exists and belongs to the user
    const { data: existingWorkflow, error: checkError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !existingWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied', details: checkError },
        { status: 404 }
      );
    }
    
    // Delete the workflow
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', userId);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete workflow', details: deleteError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow', details: error },
      { status: 500 }
    );
  }
} 