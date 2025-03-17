'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomAgentData, getUserCustomAgents, saveCustomAgent, deleteCustomAgent } from '@/lib/supabase';
import { useUser } from './user-context';

interface AgentContextType {
  customAgents: CustomAgentData[];
  isLoading: boolean;
  error: Error | null;
  saveAgent: (agent: CustomAgentData) => Promise<{ success: boolean; id?: string; error?: any }>;
  deleteAgent: (id: string) => Promise<{ success: boolean; error?: any }>;
  refreshAgents: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [customAgents, setCustomAgents] = useState<CustomAgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshAgents = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const result = await getUserCustomAgents(user.id);
      if (result.success && result.data) {
        setCustomAgents(result.data);
      } else {
        throw new Error('Failed to fetch custom agents');
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      refreshAgents();
    }
  }, [user?.id]);

  const saveAgent = async (agent: CustomAgentData) => {
    try {
      const result = await saveCustomAgent(agent);
      if (result.success) {
        await refreshAgents();
      }
      return result;
    } catch (err) {
      console.error('Error saving agent:', err);
      return { success: false, error: err };
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const result = await deleteCustomAgent(id);
      if (result.success) {
        await refreshAgents();
      }
      return result;
    } catch (err) {
      console.error('Error deleting agent:', err);
      return { success: false, error: err };
    }
  };

  return (
    <AgentContext.Provider
      value={{
        customAgents,
        isLoading,
        error,
        saveAgent,
        deleteAgent,
        refreshAgents,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
} 