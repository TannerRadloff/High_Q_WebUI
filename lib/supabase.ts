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
  description?: string;
  graph: any; // JSON representation of the workflow
  created_at?: string;
  updated_at?: string;
};

// Types for tasks
export type TaskData = {
  id?: string;
  user_id: string;
  workflow_id?: string; // Optional, if it's part of a workflow
  description: string;
  agent: string; // Which agent handled it
  status: 'queued' | 'in_progress' | 'completed' | 'error';
  result?: any;
  parent_task_id?: string; // Optional, if it was spawned by another task
  created_at?: string;
  updated_at?: string;
};

// Types for chat messages
export type ChatMessageData = {
  id?: number;
  user_id: string;
  role: 'user' | 'assistant' | 'system' | string; // 'agent:name' for specific agents
  content: string;
  session_id: string;
  task_id?: string; // Optional, if associated with a task
  created_at?: string;
};

// Types for files
export type FileData = {
  id?: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  task_id?: string; // Optional, if associated with a task
  workflow_id?: string; // Optional, if associated with a workflow
  uploaded_at?: string;
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

// Function to get user tasks
export async function getUserTasks(userId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return { data: null, error };
  }
}

// Function to get task details
export async function getTask(id: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching task:', error);
    return { data: null, error };
  }
}

// Function to create a task
export async function createTask(task: TaskData) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating task:', error);
    return { data: null, error };
  }
}

// Function to update a task
export async function updateTask(id: string, updates: Partial<TaskData>) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating task:', error);
    return { data: null, error };
  }
}

// Function to save a chat message
export async function saveChatMessage(message: ChatMessageData) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving chat message:', error);
    return { data: null, error };
  }
}

// Function to get chat messages for a session
export async function getChatMessages(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return { data: null, error };
  }
}

// Function to save file metadata
export async function saveFileMetadata(file: FileData) {
  try {
    const { data, error } = await supabase
      .from('files')
      .insert(file)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving file metadata:', error);
    return { data: null, error };
  }
}

// Function to get files for a user
export async function getUserFiles(userId: string) {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user files:', error);
    return { data: null, error };
  }
}

// Function to get files for a task
export async function getTaskFiles(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching task files:', error);
    return { data: null, error };
  }
} 