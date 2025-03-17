import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { SavedAgentConfig, AgentTool } from '@/components/agents-dashboard/types';

/**
 * GET /api/agent-config
 * Retrieves all saved agent configurations for the authenticated user
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
    
    // Query agent configurations for this user
    const { data: configurations, error } = await supabase
      .from('agent_configuration')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching agent configurations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent configurations' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ configurations });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-config
 * Creates a new agent configuration
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
    const { name, type, instructions, model, tools, icon, specialization } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    
    // Create a new agent configuration
    const configId = uuidv4();
    const now = new Date().toISOString();
    
    // Insert the agent configuration record
    const { error: configError } = await supabase
      .from('agent_configuration')
      .insert({
        id: configId,
        user_id: userId,
        name,
        type,
        instructions,
        model,
        tools: tools || [],
        icon: icon || '🤖',
        specialization: specialization || '',
        created_at: now,
        updated_at: now
      });
    
    if (configError) {
      console.error('Error creating agent configuration:', configError);
      return NextResponse.json(
        { error: 'Failed to save agent configuration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      configId,
      message: 'Agent configuration saved successfully'
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
 * DELETE /api/agent-config
 * Deletes an agent configuration
 */
export async function DELETE(request: NextRequest) {
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
    
    // Parse the request URL to get the configuration ID
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');
    
    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }
    
    // Verify ownership before deleting
    const { data: configData } = await supabase
      .from('agent_configuration')
      .select('user_id')
      .eq('id', configId)
      .single();
    
    if (!configData || configData.user_id !== userId) {
      return NextResponse.json(
        { error: 'Configuration not found or access denied' },
        { status: 403 }
      );
    }
    
    // Delete the configuration
    const { error: deleteError } = await supabase
      .from('agent_configuration')
      .delete()
      .eq('id', configId);
    
    if (deleteError) {
      console.error('Error deleting agent configuration:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete agent configuration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Agent configuration deleted successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 