import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// In a real app, you would get these values from environment variables
// For this demo, we're using placeholders
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for workflows
export type WorkflowData = {
  id?: string;
  user_id: string;
  name: string;
  graph: any; // JSON representation of the workflow
  created_at?: string;
  updated_at?: string;
};

// Types for custom agents
export type CustomAgentData = {
  id?: string;
  user_id: string;
  name: string;
  type: string; // e.g., 'research', 'code', 'analysis', etc.
  instructions: string; // Custom instructions/prompt for the agent
  created_at?: string;
  updated_at?: string;
};

// Types for agent tasks
export type AgentTaskData = {
  id?: string;
  user_id: string;
  query_id?: string;
  description: string;
  agent: string;
  status: 'queued' | 'in_progress' | 'completed' | 'error';
  result?: any;
  parent_task_id?: string;
  created_at?: string;
  updated_at?: string;
};

// Function to save a workflow
export async function saveWorkflow(workflow: WorkflowData) {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .upsert(workflow, { onConflict: 'id' })
      .select('id');
    
    if (error) throw error;
    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    console.error('Error saving workflow:', error);
    return { success: false, error };
  }
}

// Function to get all workflows for a user
export async function getUserWorkflows(userId: string) {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting workflows:', error);
    return { success: false, error };
  }
}

// Function to get a specific workflow
export async function getWorkflow(id: string) {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting workflow:', error);
    return { success: false, error };
  }
}

// Function to delete a workflow
export async function deleteWorkflow(id: string) {
  try {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return { success: false, error };
  }
}

// Function to save a custom agent
export async function saveCustomAgent(agent: CustomAgentData) {
  try {
    const { data, error } = await supabase
      .from('custom_agents')
      .upsert(agent, { onConflict: 'id' })
      .select('id');
    
    if (error) throw error;
    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    console.error('Error saving custom agent:', error);
    return { success: false, error };
  }
}

// Function to get all custom agents for a user
export async function getUserCustomAgents(userId: string) {
  try {
    const { data, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting custom agents:', error);
    return { success: false, error };
  }
}

// Function to get a specific custom agent
export async function getCustomAgent(id: string) {
  try {
    const { data, error } = await supabase
      .from('custom_agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting custom agent:', error);
    return { success: false, error };
  }
}

// Function to delete a custom agent
export async function deleteCustomAgent(id: string) {
  try {
    const { error } = await supabase
      .from('custom_agents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting custom agent:', error);
    return { success: false, error };
  }
}

// Function to create a new agent task
export async function createAgentTask(task: AgentTaskData) {
  try {
    const { data, error } = await supabase
      .from('agent_tasks')
      .insert(task)
      .select('id');
    
    if (error) throw error;
    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    console.error('Error creating agent task:', error);
    return { success: false, error };
  }
}

// Function to update an agent task
export async function updateAgentTask(id: string, updates: Partial<AgentTaskData>) {
  try {
    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('agent_tasks')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating agent task:', error);
    return { success: false, error };
  }
}

// Function to get all agent tasks for a user
export async function getAgentTasks(userId: string) {
  try {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting agent tasks:', error);
    return { success: false, error };
  }
}

// Function to get all agent tasks for a specific query/conversation
export async function getAgentTasksByQuery(userId: string, queryId: string | null) {
  try {
    const query = supabase
      .from('agent_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    // Only add query_id filter if queryId is provided
    if (queryId) {
      query.eq('query_id', queryId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting agent tasks by query:', error);
    return { success: false, error };
  }
} 