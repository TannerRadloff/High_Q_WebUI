import { Agent, Connection } from '@/components/agents-dashboard/types';
import { fetchWorkflow } from '@/lib/agent-workflow';
import { AgentStatus, processWithAgents } from './agentService';

/**
 * Interface for workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  chatId: string;
  message: string;
  onAgentStatusUpdate?: (status: AgentStatus) => void;
}

/**
 * Execute a workflow with the given message
 */
export async function executeWorkflow(context: WorkflowExecutionContext): Promise<any> {
  try {
    // Fetch the workflow
    const workflow = await fetchWorkflow(context.workflowId);
    
    if (!workflow || !workflow.agents || !workflow.connections) {
      throw new Error(`Workflow ${context.workflowId} not found or invalid`);
    }
    
    // Find the entry point agent
    const entryPointAgentId = workflow.entry_point_agent_id;
    const entryAgent = workflow.agents.find(agent => agent.id === entryPointAgentId);
    
    if (!entryAgent) {
      throw new Error(`Entry point agent not found in workflow ${context.workflowId}`);
    }
    
    // Start with the entry agent
    let currentAgentId = entryPointAgentId;
    let currentMessage = context.message;
    let finalResponse: any = null;
    
    // Track visited agents to prevent infinite loops
    const visitedAgents = new Set<string>();
    
    // Process through the workflow
    while (currentAgentId && !visitedAgents.has(currentAgentId)) {
      // Mark this agent as visited
      visitedAgents.add(currentAgentId);
      
      // Get the current agent
      const currentAgent = workflow.agents.find(agent => agent.id === currentAgentId);
      
      if (!currentAgent) {
        break;
      }
      
      // Update status if callback provided
      if (context.onAgentStatusUpdate) {
        context.onAgentStatusUpdate({
          id: currentAgent.id,
          name: currentAgent.config.name,
          type: currentAgent.type,
          task: currentMessage,
          status: 'working',
          progress: 0,
          startTime: new Date()
        });
      }
      
      // Process the message with this agent
      const result = await processWithAgents(
        typeof currentMessage === 'string' ? currentMessage : JSON.stringify(currentMessage),
        context.chatId,
        (status) => {
          if (context.onAgentStatusUpdate) {
            context.onAgentStatusUpdate({
              ...status,
              id: currentAgent.id,
              name: currentAgent.config.name,
              type: currentAgent.type
            });
          }
        }
      );
      
      // Store the response
      finalResponse = result;
      
      // Find the next agent in the workflow
      const outgoingConnections = workflow.connections.filter(
        conn => conn.sourceAgentId === currentAgentId
      );
      
      // If there are outgoing connections, follow the first one
      if (outgoingConnections.length > 0) {
        currentAgentId = outgoingConnections[0].targetAgentId;
        currentMessage = result.response || result; // Pass the result to the next agent
      } else {
        // No more connections, we're done
        break;
      }
    }
    
    return finalResponse;
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

/**
 * Get a summary of the workflow
 */
export async function getWorkflowSummary(workflowId: string): Promise<{
  name: string;
  description: string;
  agentCount: number;
}> {
  try {
    const workflow = await fetchWorkflow(workflowId);
    
    return {
      name: workflow.name,
      description: workflow.description,
      agentCount: workflow.agents?.length || 0
    };
  } catch (error) {
    console.error(`Error getting workflow summary for ${workflowId}:`, error);
    throw error;
  }
} 