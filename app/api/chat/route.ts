import { NextResponse } from 'next/server';
import { MimirAgent, runAgent } from '@/lib/agents';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Initialize the Mimir agent (singleton instance)
const mimirAgent = new MimirAgent();

// Simulate a delay to mimic API processing time
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const { message, taskId, instruction, newAgent, workflowId, options } = body;
    
    // Generate a unique query ID for tracking related tasks
    const queryId = uuidv4();
    
    // Context for agent execution
    const context = {
      userId,
      queryId,
      options
    };
    
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
    const response = await runAgent(mimirAgent, message, context);
    
    return NextResponse.json({
      response,
      queryId
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 