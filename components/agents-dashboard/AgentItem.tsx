import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface AgentItemProps {
  id: string;
  name: string;
  description: string;
}

/**
 * AgentItem - A draggable component representing an agent type that can be added to the workflow
 */
const AgentItem: React.FC<AgentItemProps> = ({ id, name, description }) => {
  // Set up draggable behavior
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 border border-slate-200 dark:border-slate-800 rounded-md cursor-grab 
                 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow
                 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <h3 className="font-medium">{name}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
};

export default AgentItem; 