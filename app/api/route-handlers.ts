import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow } from '@/lib/agents/workflowService';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';

// Define the request schema for workflow execution
const workflowRequestSchema = z.object({
  workflowId: z.string(),
  message: z.string(),
  chatId: z.string(),
});

/**
 * Shared handler for workflow execution endpoints
 * Used by both the workflow-execute and agent-workflow-execute routes
 */
export async function handleWorkflowExecute(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const result = workflowRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { workflowId, message, chatId } = result.data;
    
    // Execute the workflow
    const response = await executeWorkflow({
      workflowId,
      chatId,
      message,
    });
    
    // Format the response consistently
    const formattedResponse = {
      response: typeof response === 'string' ? response : response.response || JSON.stringify(response),
      agent: {
        id: 'workflow-agent',
        name: 'Workflow Agent',
        type: 'workflow',
        icon: '🔄'
      },
      workflowId
    };
    
    // Return the response
    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error executing workflow:', error);
    
    return NextResponse.json(
      { error: 'Failed to execute workflow', message: (error as Error).message },
      { status: 500 }
    );
  }
} 