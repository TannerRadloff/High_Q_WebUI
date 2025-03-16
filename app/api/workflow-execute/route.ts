import { NextRequest } from 'next/server';
import { handleWorkflowExecute } from '../route-handlers';

/**
 * Handle POST requests to execute a workflow
 * This route uses the shared handler for workflow execution
 */
export async function POST(req: NextRequest) {
  return handleWorkflowExecute(req);
} 