'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Task = {
  id: string;
  user_id: string;
  query_id?: string;
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
  fetchTasks: (queryId?: string) => Promise<void>;
  clearTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQueryId, setCurrentQueryId] = useState<string | undefined>(undefined);

  // Fetch tasks
  const fetchTasks = async (queryId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = queryId ? `/api/tasks?query_id=${queryId}` : '/api/tasks';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
      
      // Save the query ID for real-time updates
      setCurrentQueryId(queryId);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Clear tasks
  const clearTasks = () => {
    setTasks([]);
    setCurrentQueryId(undefined);
  };

  // Set up real-time subscription
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Subscribe to changes on the agent_tasks table
    const subscription = supabase
      .channel('agent_tasks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_tasks',
      }, (payload) => {
        // Handle different types of changes
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task;
          // Only add if it matches our current query filter or we're showing all
          if (!currentQueryId || newTask.query_id === currentQueryId) {
            setTasks((prev) => [newTask, ...prev]);
          }
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
      supabase.channel('agent_tasks_changes').unsubscribe();
    };
  }, [currentQueryId]);

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