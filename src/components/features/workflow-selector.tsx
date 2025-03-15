import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { fetchWorkflows } from '@/lib/agent-workflow';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';

export interface AgentWorkflowSummary {
  id: string;
  name: string;
  description: string;
}

interface WorkflowSelectorProps {
  selectedWorkflowId: string | null;
  onWorkflowSelect: (workflowId: string | null) => void;
  className?: string;
}

function WorkflowSelectorComponent({
  selectedWorkflowId,
  onWorkflowSelect,
  className = '',
}: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<AgentWorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Get the selected workflow name
  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);
  
  // Load workflows on component mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const workflowsData = await fetchWorkflows();
      
      // Map to a simpler format for the selector
      const workflowSummaries: AgentWorkflowSummary[] = workflowsData.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description
      }));
      
      setWorkflows(workflowSummaries);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load your agent workflows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = useCallback((workflowId: string | null) => {
    onWorkflowSelect(workflowId);
    setIsOpen(false);
  }, [onWorkflowSelect]);

  return (
    <div className={`relative ${className}`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🔄</span>
              <span className="truncate max-w-[150px]">
                {isLoading 
                  ? 'Loading workflows...' 
                  : selectedWorkflow 
                    ? selectedWorkflow.name 
                    : 'Default (Mimir)'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[240px]">
          <DropdownMenuItem
            className="flex items-center justify-between"
            onSelect={() => handleSelect(null)}
          >
            <div className="flex flex-col">
              <span>Default (Mimir)</span>
              <span className="text-xs text-muted-foreground">Delegation agent</span>
            </div>
            {selectedWorkflowId === null && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
          
          {workflows.map((workflow) => (
            <DropdownMenuItem
              key={workflow.id}
              className="flex items-center justify-between"
              onSelect={() => handleSelect(workflow.id)}
            >
              <div className="flex flex-col">
                <span>{workflow.name}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {workflow.description}
                </span>
              </div>
              {selectedWorkflowId === workflow.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          
          {workflows.length === 0 && !isLoading && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <p>No saved workflows found</p>
              <p className="text-xs mt-1">Create workflows in the Agent Builder</p>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const WorkflowSelector = memo(WorkflowSelectorComponent); 