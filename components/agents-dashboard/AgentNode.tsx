import React, { useState } from 'react';
import { Agent, AgentType } from './types';

interface AgentNodeProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
  onConnectionPointClick?: (agentId: string, isSource: boolean) => void;
  isCreatingConnection?: boolean;
  onDragEnd?: (agentId: string, position: { x: number; y: number }) => void;
}

/**
 * AgentNode - A component representing an agent placed on the canvas
 */
const AgentNode: React.FC<AgentNodeProps> = ({ 
  agent, 
  isSelected, 
  onClick, 
  onConnectionPointClick,
  isCreatingConnection = false,
  onDragEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Different color schemes based on agent type
  const getAgentStyles = () => {
    switch (agent.type) {
      case AgentType.RESEARCH:
        return 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800';
      case AgentType.REPORT:
        return 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800';
      case AgentType.JUDGE:
        return 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800';
      case AgentType.CODING:
        return 'bg-amber-100 dark:bg-amber-900 border-amber-200 dark:border-amber-800';
      case AgentType.CREATIVE:
        return 'bg-pink-100 dark:bg-pink-900 border-pink-200 dark:border-pink-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800';
    }
  };

  // Handle connection point click
  const handleConnectionPointClick = (e: React.MouseEvent, isSource: boolean) => {
    e.stopPropagation(); // Prevent the agent onClick from firing
    if (onConnectionPointClick) {
      onConnectionPointClick(agent.id, isSource);
    }
  };

  // Start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCreatingConnection) return; // Don't start dragging if we're creating a connection
    
    // Only allow dragging with left mouse button
    if (e.button !== 0) return;
    
    // Calculate offset from the top-left corner of the element
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();
  };

  // Track dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Get the canvas element's position
    const canvas = document.querySelector('[data-droppable-id="canvas"]');
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate new position relative to the canvas
    let newX = e.clientX - canvasRect.left - dragOffset.x;
    let newY = e.clientY - canvasRect.top - dragOffset.y;
    
    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(newX, canvasRect.width - 192)); // 48px width * 4
    newY = Math.max(0, Math.min(newY, canvasRect.height - 56)); // Approximate height
    
    // Update the element's position
    const element = e.target as HTMLElement;
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  };

  // End dragging
  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Get the new position
    const element = e.target as HTMLElement;
    const newX = parseInt(element.style.left, 10) || agent.position.x;
    const newY = parseInt(element.style.top, 10) || agent.position.y;
    
    // Call onDragEnd with the new position
    if (onDragEnd) {
      onDragEnd(agent.id, { x: newX, y: newY });
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: agent.position.x,
        top: agent.position.y,
        cursor: isDragging ? 'grabbing' : isCreatingConnection ? 'pointer' : 'grab',
        zIndex: isDragging || isSelected ? 10 : 1
      }}
      className={`p-4 w-48 rounded-lg shadow-md border ${getAgentStyles()} 
                ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                transition-all ${isDragging ? 'opacity-80' : 'opacity-100'}`}
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex flex-col">
        <h3 className="font-medium truncate">{agent.config.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {agent.type} Agent
        </p>
        
        {/* Source connection point (left) */}
        <div 
          className={`absolute -left-3 top-1/2 w-6 h-6 rounded-full transform -translate-y-1/2
                    flex items-center justify-center
                    ${isCreatingConnection 
                      ? 'bg-green-500 border-2 border-white dark:border-slate-800 cursor-pointer z-10' 
                      : 'hover:bg-green-400 hover:border-white hover:scale-110 cursor-pointer z-10'}`}
          onClick={(e) => handleConnectionPointClick(e, true)}
        >
          <div className="w-4 h-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full" />
        </div>
        
        {/* Target connection point (right) */}
        <div 
          className={`absolute -right-3 top-1/2 w-6 h-6 rounded-full transform -translate-y-1/2
                    flex items-center justify-center
                    ${isCreatingConnection 
                      ? 'bg-blue-500 border-2 border-white dark:border-slate-800 cursor-pointer z-10' 
                      : 'hover:bg-blue-400 hover:border-white hover:scale-110 cursor-pointer z-10'}`}
          onClick={(e) => handleConnectionPointClick(e, false)}
        >
          <div className="w-4 h-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default AgentNode; 