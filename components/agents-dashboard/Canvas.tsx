import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import AgentNode from './AgentNode';
import { Agent } from './types';

interface CanvasProps {
  agents: Agent[];
  onAgentSelect: (agent: Agent) => void;
  selectedAgentId: string | null;
}

/**
 * Canvas - A droppable area where agents can be placed and connected to form workflows
 */
const Canvas: React.FC<CanvasProps> = ({ agents, onAgentSelect, selectedAgentId }) => {
  // Set up droppable behavior for the canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full border-2 border-dashed 
                 ${isOver 
                   ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30' 
                   : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'} 
                 rounded-lg overflow-hidden relative transition-colors`}
    >
      {/* Display a helper message if no agents are added */}
      {agents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-600">
          <p>Drag agents here to build your workflow</p>
        </div>
      )}
      
      {/* Display added agents */}
      {agents.map((agent) => (
        <AgentNode
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          onClick={() => onAgentSelect(agent)}
        />
      ))}
    </div>
  );
};

export default Canvas; 