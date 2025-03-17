import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { MimirAgent, runAgent } from '@/lib/agents';

// Initialize the Mimir agent (we'll create a singleton instance)
const mimirAgent = new MimirAgent();

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
    const { message, workflowId } = body;
    
    // If a workflowId is provided, we'll execute that workflow
    if (workflowId) {
      // Fetch the workflow from the database
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();
      
      if (workflowError || !workflow) {
        return NextResponse.json(
          { error: 'Workflow not found', details: workflowError },
          { status: 404 }
        );
      }
      
      // Execute the workflow with the user's message
      // This is a placeholder for your actual workflow execution logic
      return NextResponse.json({
        sender: 'mimir',
        content: `Executing workflow "${workflow.name}" with your message: "${message}"`,
        workflowId,
        status: 'in_progress'
      });
    }
    
    // Handle regular query (no workflow) using the agent system
    // Run the Mimir agent with the user's message
    const context = { userId };
    const result = await runAgent(mimirAgent, message, context);
    
    // Format the response based on the agent result
    let response;
    
    if (result.delegationReasoning) {
      // If the query was delegated to a specialist agent
      response = {
        sender: 'agent',
        agentName: result.agent,
        content: result.content,
        delegationReasoning: result.delegationReasoning,
        model: result.model || 'gpt-4',
        timestamp: new Date().toISOString()
      };
    } else {
      // If Mimir handled it directly
      response = {
        sender: 'mimir',
        content: result.content,
        model: result.model || 'gpt-3.5-turbo',
        timestamp: new Date().toISOString()
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { error: 'Failed to process query', details: error },
      { status: 500 }
    );
  }
} 