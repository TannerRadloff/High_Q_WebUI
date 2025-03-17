'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './user-context';
import { saveWorkflow, getUserWorkflows, getWorkflow, deleteWorkflow, WorkflowData } from '@/lib/supabase';
import { patentAnalysisWorkflow, exampleWorkflows } from '@/components/workflow/example-workflows';
import { Edge, Node } from 'reactflow';

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
        // For demo purposes, we'll create a sample workflow if none exist
        // In a real app, you would fetch from Supabase
        const result = await getUserWorkflows(user.id);
        
        if (result.success && result.data) {
          if (result.data.length === 0) {
            // If no workflows exist, create a sample one
            const demoWorkflow: WorkflowData = {
              user_id: user.id,
              name: patentAnalysisWorkflow.name,
              graph: {
                nodes: patentAnalysisWorkflow.nodes,
                edges: patentAnalysisWorkflow.edges,
              },
            };
            
            const saveResult = await saveWorkflow(demoWorkflow);
            if (saveResult.success && saveResult.id) {
              demoWorkflow.id = saveResult.id;
              setWorkflows([demoWorkflow]);
            }
          } else {
            setWorkflows(result.data);
          }
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        
        // For demo, create mock workflows
        const mockWorkflows: WorkflowData[] = exampleWorkflows.map((workflow, index) => ({
          id: `demo-workflow-${index}`,
          user_id: user.id,
          name: workflow.name,
          graph: {
            nodes: workflow.nodes,
            edges: workflow.edges,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        
        setWorkflows(mockWorkflows);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, [user]);

  // Function to refresh workflows
  const refreshWorkflows = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getUserWorkflows(user.id);
      if (result.success && result.data) {
        setWorkflows(result.data);
      }
    } catch (error) {
      console.error('Error refreshing workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to save current workflow
  const saveCurrentWorkflow = async (name: string, nodes: Node[], edges: Edge[]) => {
    if (!user) return { success: false };
    
    try {
      const workflowToUpdate = workflows.find(w => w.id === activeWorkflowId);
      
      if (!workflowToUpdate) {
        return createWorkflow(name, nodes, edges);
      }
      
      const updatedWorkflow: WorkflowData = {
        ...workflowToUpdate,
        name,
        graph: { nodes, edges },
      };
      
      const result = await saveWorkflow(updatedWorkflow);
      if (result.success) {
        await refreshWorkflows();
      }
      
      return result;
    } catch (error) {
      console.error('Error saving workflow:', error);
      return { success: false, error };
    }
  };

  // Function to create a new workflow
  const createWorkflow = async (name: string, nodes: Node[], edges: Edge[]) => {
    if (!user) return { success: false };
    
    try {
      const newWorkflow: WorkflowData = {
        user_id: user.id,
        name,
        graph: { nodes, edges },
      };
      
      const result = await saveWorkflow(newWorkflow);
      if (result.success) {
        await refreshWorkflows();
        if (result.id) {
          setActiveWorkflowId(result.id);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error creating workflow:', error);
      return { success: false, error };
    }
  };

  // Function to delete a workflow
  const deleteUserWorkflow = async (id: string) => {
    try {
      const result = await deleteWorkflow(id);
      if (result.success) {
        if (activeWorkflowId === id) {
          setActiveWorkflowId(null);
        }
        await refreshWorkflows();
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return { success: false, error };
    }
  };

  // Provide the workflow context to children components
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
        refreshWorkflows 
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
} 