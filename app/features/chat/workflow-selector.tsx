'use client';

import { memo } from 'react';

interface WorkflowSelectorProps {
  onSelect: (workflow: string) => void;
  selectedWorkflow: string;
}

function PureWorkflowSelector({ onSelect, selectedWorkflow }: WorkflowSelectorProps) {
  const workflows = [
    { id: 'default', name: 'Default' },
    { id: 'creative', name: 'Creative' },
    { id: 'analysis', name: 'Analysis' }
  ];

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b">
      {workflows.map((workflow) => (
        <button
          key={workflow.id}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedWorkflow === workflow.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 hover:bg-secondary/80'
          }`}
          onClick={() => onSelect(workflow.id)}
        >
          {workflow.name}
        </button>
      ))}
    </div>
  );
}

export const WorkflowSelector = memo(PureWorkflowSelector); 