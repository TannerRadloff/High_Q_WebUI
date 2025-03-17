import { BaseAgent, AgentResponse } from './agent-base';
import { MimirAgent } from './mimir-agent';
import { createAgentTask, updateAgentTask } from '@/lib/supabase';

/**
 * Run an agent with a prompt
 * @param agent The agent to run
 * @param prompt The user's prompt
 * @param context Optional context for the agent
 * @returns The result of running the agent
 */
export async function runAgent(
  agent: BaseAgent,
  prompt: string,
  context?: any
): Promise<AgentResponse> {
  let taskId: string | undefined;
  
  try {
    // Create a task record in the database
    if (context?.userId) {
      const taskResult = await createAgentTask({
        user_id: context.userId,
        query_id: context.queryId,
        description: `Processing with ${agent.name}: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`,
        agent: agent.name,
        status: 'in_progress',
        parent_task_id: context.parentTaskId,
      });
      
      if (taskResult.success) {
        taskId = taskResult.id;
        // Update context with this task's ID for potential subtasks
        context.parentTaskId = taskId;
      }
    }
    
    // If this is the Mimir agent, it will handle delegation
    if (agent instanceof MimirAgent) {
      const result = await agent.run(prompt, context);
      
      // Update task status to completed
      if (taskId) {
        await updateAgentTask(taskId, {
          status: 'completed',
          result: result,
        });
      }
      
      return result;
    }
    
    // For other agents, check if they can handle the query
    const canHandle = await agent.canHandle(prompt);
    
    if (canHandle) {
      // Run the agent directly
      const result = await agent.run(prompt, context);
      
      // Update task status to completed
      if (taskId) {
        await updateAgentTask(taskId, {
          status: 'completed',
          result: result,
        });
      }
      
      return result;
    } else {
      // If the agent can't handle it, return a message indicating that
      const errorResponse = {
        content: `I'm sorry, as a ${agent.name}, I don't have the expertise to handle this query. Please try asking a different agent or rephrase your question.`,
        agent: agent.name,
        model: agent.model
      };
      
      // Update task status to error
      if (taskId) {
        await updateAgentTask(taskId, {
          status: 'error',
          result: errorResponse,
        });
      }
      
      return errorResponse;
    }
  } catch (error) {
    console.error('Error running agent:', error);
    const errorResponse = {
      content: 'There was an error processing your request. Please try again later.',
      agent: agent.name,
      model: agent.model || 'unknown'
    };
    
    // Update task status to error
    if (taskId) {
      await updateAgentTask(taskId, {
        status: 'error',
        result: errorResponse,
      });
    }
    
    return errorResponse;
  }
} 