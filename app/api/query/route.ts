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
      // We'll use the runWorkflow endpoint to execute the workflow
      // First, prepare the request body
      const workflowRequest = {
        workflowId,
        input: message || ''
      };
      
      // Make an internal request to the runWorkflow endpoint
      const response = await fetch(new URL('/api/runWorkflow', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass along any auth headers
          ...Object.fromEntries(
            Array.from(request.headers.entries())
              .filter(([key]) => ['cookie', 'authorization'].includes(key.toLowerCase()))
          )
        },
        body: JSON.stringify(workflowRequest)
      });
      
      // Return the response from the workflow execution
      const workflowResult = await response.json();
      
      // Format the response to include workflow execution details
      return NextResponse.json({
        sender: 'workflow',
        workflowId: workflowId,
        content: workflowResult.result?.content || 'Workflow executed successfully',
        status: workflowResult.status,
        taskId: workflowResult.taskId,
        steps: workflowResult.steps || [], // Include steps for the UI to display
        timestamp: new Date().toISOString()
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