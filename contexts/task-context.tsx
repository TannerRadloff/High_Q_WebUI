'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './user-context';

export type Task = {
  id: string;
  user_id: string;
  workflow_id?: string;
  description: string;
  agent: string;
  status: 'queued' | 'in_progress' | 'completed' | 'error';
  result?: any;
  parent_task_id?: string;
  created_at: string;
  updated_at: string;
};

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: (workflowId?: string) => Promise<void>;
  clearTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | undefined>(undefined);

  // Fetch tasks
  const fetchTasks = async (workflowId?: string) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch tasks directly from Supabase with RLS
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by workflow_id if provided
      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setTasks(data || []);
      
      // Save the workflow ID for real-time updates
      setCurrentWorkflowId(workflowId);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Clear tasks
  const clearTasks = () => {
    setTasks([]);
    setCurrentWorkflowId(undefined);
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Subscribe to changes on the tasks table
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: currentWorkflowId ? `workflow_id=eq.${currentWorkflowId}` : undefined
      }, (payload) => {
        // Handle different types of changes
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task;
          setTasks((prev) => [newTask, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedTask = payload.new as Task;
          setTasks((prev) =>
            prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedTask = payload.old as Task;
          setTasks((prev) => prev.filter((task) => task.id !== deletedTask.id));
        }
      })
      .subscribe();

    // Clean up the subscription
    return () => {
      channel.unsubscribe();
    };
  }, [user, currentWorkflowId]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        fetchTasks,
        clearTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
} 