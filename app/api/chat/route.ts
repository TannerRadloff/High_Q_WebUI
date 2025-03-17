import { NextResponse } from 'next/server';
import { MimirAgent, runAgent } from '@/lib/agents';
import { verifyAuth } from '@/lib/auth';

// Initialize the Mimir agent (singleton instance)
const mimirAgent = new MimirAgent();

// Simulate a delay to mimic API processing time
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, taskId, instruction, newAgent, workflowId } = body;
    
    // Verify authentication (optional, comment out if not using auth)
    // const { authenticated, userId, error: authError } = await verifyAuth();
    // if (!authenticated) {
    //   return NextResponse.json(
    //     { error: 'Authentication required', details: authError },
    //     { status: 401 }
    //   );
    // }
    
    // Handle task instruction
    if (taskId && instruction) {
      return NextResponse.json({
        sender: 'mimir',
        content: `I've updated the task with your instruction: "${instruction}"`,
        taskId,
        taskStatus: 'in_progress'
      });
    }
    
    // Handle task redirection
    if (taskId && newAgent) {
      return NextResponse.json({
        sender: 'mimir',
        content: `I've reassigned the task to ${newAgent}`,
        taskId,
        taskStatus: 'queued'
      });
    }

    // If a workflowId is provided, execute that workflow
    if (workflowId) {
      // This would be replaced with actual workflow execution logic
      return NextResponse.json({
        sender: 'mimir',
        content: `Executing workflow with ID ${workflowId} for your message: "${message}"`,
        workflowId,
        status: 'in_progress'
      });
    }

    // For regular messages, use our orchestration system
    const result = await runAgent(mimirAgent, message);
    
    // Format the response based on the agent result
    if (result.delegationReasoning) {
      // If the query was delegated to a specialist agent
      return NextResponse.json({
        sender: 'agent',
        agentName: result.agent,
        content: result.content,
        delegationReasoning: result.delegationReasoning,
        model: result.model || 'gpt-4',
        timestamp: new Date().toISOString()
      });
    } else {
      // If Mimir handled it directly
      return NextResponse.json({
        sender: 'mimir',
        content: result.content,
        model: result.model || 'gpt-3.5-turbo',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error processing chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error },
      { status: 500 }
    );
  }
} 