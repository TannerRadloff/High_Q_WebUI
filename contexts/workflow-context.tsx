'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './user-context';
import { saveWorkflow, getUserWorkflows, getWorkflow, deleteWorkflow, WorkflowData } from '@/lib/supabase';
import { patentAnalysisWorkflow, exampleWorkflows } from '@/components/workflow/example-workflows';
import { Edge, Node } from 'reactflow';
import { supabase } from '@/lib/supabase';

// Define the context type
type WorkflowContextType = {
  workflows: WorkflowData[];
  loading: boolean;
  activeWorkflowId: string | null;
  setActiveWorkflowId: (id: string | null) => void;
  saveCurrentWorkflow: (name: string, nodes: Node[], edges: Edge[]) => Promise<{ success: boolean; id?: string }>;
  createWorkflow: (name: string, nodes: Node[], edges: Edge[]) => Promise<{ success: boolean; id?: string }>;
  deleteUserWorkflow: (id: string) => Promise<{ success: boolean }>;
  refreshWorkflows: () => Promise<void>;
};

// Create the context with a default value
const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// Custom hook to use the workflow context
export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}

// Provider component that wraps the app
export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  // Load workflows when user changes
  useEffect(() => {
    const loadWorkflows = async () => {
      if (!user) {
        setWorkflows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getUserWorkflows(user.id);
        
        if (result.success && result.data) {
          if (result.data.length === 0) {
            // If no workflows exist, create a sample one
            const demoWorkflow: WorkflowData = {
              user_id: user.id,
              name: patentAnalysisWorkflow.name,
              description: "Sample workflow for patent analysis",
              graph: {
                nodes: patentAnalysisWorkflow.nodes,
                edges: patentAnalysisWorkflow.edges
              },
            };
            
            const saveResult = await saveWorkflow(demoWorkflow);
            if (saveResult.success) {
              // Fetch again to get the created workflow with ID
              const updatedResult = await getUserWorkflows(user.id);
              if (updatedResult.success) {
                setWorkflows(updatedResult.data || []);
              }
            } else {
              // Just use examples without persisting
              setWorkflows(exampleWorkflows.map(workflow => ({
                user_id: user.id,
                name: workflow.name,
                description: "Example workflow",
                graph: {
                  nodes: workflow.nodes,
                  edges: workflow.edges
                }
              })));
            }
          } else {
            setWorkflows(result.data);
          }
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        // Fallback to examples
        setWorkflows(exampleWorkflows.map(workflow => ({
          user_id: user.id,
          name: workflow.name,
          description: "Example workflow",
          graph: {
            nodes: workflow.nodes,
            edges: workflow.edges
          }
        })));
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
    
    // Set up real-time subscription for workflows
    if (user) {
      const channel = supabase
        .channel('workflows_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'workflows'
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newWorkflow = payload.new as WorkflowData;
            setWorkflows((prev) => [newWorkflow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedWorkflow = payload.new as WorkflowData;
            setWorkflows((prev) =>
              prev.map((workflow) => 
                (workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow)
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedWorkflow = payload.old as WorkflowData;
            setWorkflows((prev) => 
              prev.filter((workflow) => workflow.id !== deletedWorkflow.id)
            );
          }
        })
        .subscribe();
        
      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  const refreshWorkflows = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getUserWorkflows(user.id);
      if (result.success) {
        setWorkflows(result.data || []);
      }
    } catch (error) {
      console.error('Error refreshing workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentWorkflow = async (name: string, nodes: Node[], edges: Edge[]) => {
    if (!user || !activeWorkflowId) {
      return { success: false };
    }
    
    try {
      // Find the active workflow
      const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
      if (!activeWorkflow) {
        return { success: false };
      }
      
      // Update the workflow
      const updatedWorkflow: WorkflowData = {
        ...activeWorkflow,
        name,
        graph: { nodes, edges }
      };
      
      const result = await saveWorkflow(updatedWorkflow);
      
      if (result.success) {
        // Update local state
        setWorkflows(workflows.map(w => 
          w.id === activeWorkflowId ? updatedWorkflow : w
        ));
      }
      
      return result;
    } catch (error) {
      console.error('Error saving workflow:', error);
      return { success: false };
    }
  };

  const createWorkflow = async (name: string, nodes: Node[], edges: Edge[]) => {
    if (!user) {
      return { success: false };
    }
    
    try {
      const newWorkflow: WorkflowData = {
        user_id: user.id,
        name,
        description: `Created on ${new Date().toLocaleDateString()}`,
        graph: { nodes, edges }
      };
      
      const result = await saveWorkflow(newWorkflow);
      
      if (result.success && result.id) {
        // We'll let the real-time subscription handle updating the list
        // but we can also set the active workflow immediately
        setActiveWorkflowId(result.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating workflow:', error);
      return { success: false };
    }
  };

  const deleteUserWorkflow = async (id: string) => {
    if (!user) {
      return { success: false };
    }
    
    try {
      const result = await deleteWorkflow(id);
      
      if (result.success) {
        // Update local state (but real-time will also handle this)
        setWorkflows(workflows.filter(w => w.id !== id));
        
        // Clear active workflow if it was deleted
        if (activeWorkflowId === id) {
          setActiveWorkflowId(null);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return { success: false };
    }
  };

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        loading,
        activeWorkflowId,
        setActiveWorkflowId,
        saveCurrentWorkflow,
        createWorkflow,
        deleteUserWorkflow,
        refreshWorkflows,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
} 