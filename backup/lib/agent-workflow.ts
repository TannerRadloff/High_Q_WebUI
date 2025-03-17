import { Agent, Connection } from '@/components/agents-dashboard/types';

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  entry_point_agent_id: string;
  version?: number;
  agents?: Agent[];
  connections?: Connection[];
}

/**
 * Fetch all agent workflows for the current user
 */
export async function fetchWorkflows(): Promise<AgentWorkflow[]> {
  try {
    const response = await fetch('/api/agent-workflow', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch workflows');
    }

    const data = await response.json();
    return data.workflows;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    throw error;
  }
}

/**
 * Fetch a specific agent workflow by ID
 */
export async function fetchWorkflow(id: string): Promise<AgentWorkflow> {
  try {
    const response = await fetch(`/api/agent-workflow/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch workflow');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching workflow ${id}:`, error);
    throw error;
  }
}

/**
 * Save a new agent workflow
 */
export async function createWorkflow(
  name: string,
  description: string,
  agents: Agent[],
  connections: Connection[],
  entryPointAgentId: string
): Promise<{ workflowId: string }> {
  try {
    const response = await fetch('/api/agent-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        agents,
        connections,
        entryPointAgentId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create workflow');
    }

    const data = await response.json();
    return { workflowId: data.workflowId };
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}

/**
 * Update an existing agent workflow
 */
export async function updateWorkflow(
  id: string,
  name: string,
  description: string,
  agents: Agent[],
  connections: Connection[],
  entryPointAgentId: string
): Promise<{ version: number }> {
  try {
    const response = await fetch(`/api/agent-workflow/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        agents,
        connections,
        entryPointAgentId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update workflow');
    }

    const data = await response.json();
    return { version: data.version };
  } catch (error) {
    console.error(`Error updating workflow ${id}:`, error);
    throw error;
  }
}

/**
 * Delete an agent workflow
 */
export async function deleteWorkflow(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/agent-workflow/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete workflow');
    }
  } catch (error) {
    console.error(`Error deleting workflow ${id}:`, error);
    throw error;
  }
} 