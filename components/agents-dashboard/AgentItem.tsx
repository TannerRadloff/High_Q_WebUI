import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { AgentType, AGENT_ICONS } from './types';

interface AgentItemProps {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isCustom?: boolean;
  specialization?: string;
}

/**
 * AgentItem - A draggable component representing an agent type that can be placed on the canvas
 */
const AgentItem: React.FC<AgentItemProps> = ({ 
  id, 
  name, 
  description,
  icon,
  isCustom = false,
  specialization
}) => {
  // Set up draggable behavior
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  // Get icon, defaulting to type-based icon or 🤖 if not available
  const displayIcon = icon || AGENT_ICONS[id as AgentType] || '🤖';
  
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 
                rounded-lg shadow-sm cursor-grab transition-all
                ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
                ${isCustom ? 'border-l-4 border-l-blue-500' : ''}
                hover:shadow-md`}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl" role="img" aria-label={`${name} icon`}>
          {displayIcon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">{name}</h3>
          {specialization && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {specialization}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentItem; 