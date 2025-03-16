'use client';

import { useCallback } from 'react';
import { AIModelSelector, ModelSelectorMode } from '@/src/components/features/model-selector';
import { AgentType } from '@/agents/AgentFactory';
import { agentTypeConfig } from '@/src/config/agent-types';

export interface AgentSelectorProps {
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  className?: string;
  disabled?: boolean;
  buttonSize?: 'default' | 'sm';
  displayMode?: 'dropdown' | 'buttons';
}

// Helper conversion functions
export function agentTypeToId(agentType: AgentType): string {
  return agentType.toLowerCase();
}

// Convert string ID to enum type for agent processing
export function idToAgentType(id: string): AgentType {
  switch (id) {
    case 'delegation': return AgentType.DELEGATION;
    case 'research': return AgentType.RESEARCH;
    case 'report': return AgentType.REPORT;
    case 'triage': return AgentType.TRIAGE;
    case 'judge': return AgentType.JUDGE;
    default: return AgentType.DELEGATION;
  }
}

/**
 * A unified agent selector component that can be used in any context
 * Leverages the AIModelSelector component for dropdown mode
 * Can also render as buttons for a different UI experience
 */
export function AgentSelector({
  selectedAgentId,
  onAgentChange,
  className,
  disabled = false,
  buttonSize = 'default',
  displayMode = 'dropdown',
}: AgentSelectorProps) {
  const handleAgentChange = useCallback((agentId: string) => {
    console.log(`[AGENT-SELECTOR] User selected agent: ${agentId}`);
    onAgentChange(agentId);
  }, [onAgentChange]);

  if (displayMode === 'dropdown') {
    return (
      <AIModelSelector
        selectedModelId={selectedAgentId}
        mode="agent-type"
        onSelect={handleAgentChange}
        buttonSize={buttonSize}
        disabled={disabled}
        className={className}
      />
    );
  }

  // Button mode display
  return (
    <div className={`flex items-center gap-2 overflow-x-auto ${className}`}>
      {agentTypeConfig
        .filter(agent => agent.id !== 'default') // Exclude the default agent
        .map(agent => (
          <button
            key={agent.id}
            onClick={() => handleAgentChange(agent.id)}
            disabled={disabled}
            className={`
              flex items-center gap-2 whitespace-nowrap px-3 py-1 rounded-md text-sm font-medium
              border border-input transition-colors
              ${selectedAgentId === agent.id 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background hover:bg-accent hover:text-accent-foreground'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-pressed={selectedAgentId === agent.id}
            type="button"
          >
            <span>{agent.name}</span>
          </button>
        ))
      }
    </div>
  );
} 