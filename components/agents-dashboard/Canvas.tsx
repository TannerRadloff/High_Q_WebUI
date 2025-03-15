import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import AgentNode from './AgentNode';
import { Agent, Connection } from './types';

interface CanvasProps {
  agents: Agent[];
  connections: Connection[];
  onAgentSelect: (agent: Agent) => void;
  selectedAgentId: string | null;
  isCreatingConnection?: boolean;
  onConnectionPointClick?: (agentId: string, isSource: boolean) => void;
  connectionSource?: string | null;
  onAgentPositionChange?: (agentId: string, position: { x: number; y: number }) => void;
}

/**
 * Canvas - A droppable area where agents can be placed and connected to form workflows
 */
const Canvas: React.FC<CanvasProps> = ({ 
  agents, 
  connections,
  onAgentSelect, 
  selectedAgentId,
  isCreatingConnection = false,
  onConnectionPointClick,
  connectionSource,
  onAgentPositionChange
}) => {
  // Set up droppable behavior for the canvas
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  // Handle agent position update
  const handleAgentDragEnd = (agentId: string, position: { x: number; y: number }) => {
    if (onAgentPositionChange) {
      onAgentPositionChange(agentId, position);
    }
  };

  // Calculate connection line coordinates
  const renderConnections = () => {
    return connections.map(connection => {
      const sourceAgent = agents.find(a => a.id === connection.sourceAgentId);
      const targetAgent = agents.find(a => a.id === connection.targetAgentId);
      
      if (!sourceAgent || !targetAgent) return null;
      
      // Calculate start and end points for the connection line
      const startX = sourceAgent.position.x + 192; // 48px (width) * 4
      const startY = sourceAgent.position.y + 28; // Approximately mid-height
      const endX = targetAgent.position.x;
      const endY = targetAgent.position.y + 28; // Approximately mid-height
      
      // SVG path for the arrow
      const path = `M${startX},${startY} C${startX + 50},${startY} ${endX - 50},${endY} ${endX},${endY}`;
      
      return (
        <svg 
          key={connection.id} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          className="overflow-visible"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-500 dark:text-blue-400"
            markerEnd="url(#arrowhead)"
          />
          {/* SVG definition for arrowhead */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon 
                points="0 0, 10 3.5, 0 7" 
                className="fill-blue-500 dark:fill-blue-400" 
              />
            </marker>
          </defs>
        </svg>
      );
    });
  };

  // Render active connection line during connection creation
  const renderActiveConnection = () => {
    if (!isCreatingConnection || !connectionSource) return null;
    
    const sourceAgent = agents.find(a => a.id === connectionSource);
    if (!sourceAgent) return null;
    
    // Get mouse position (using mousemove event in a useEffect would be more precise)
    // For now, we'll just extend a line to the right
    const startX = sourceAgent.position.x + 192; // End of the agent box
    const startY = sourceAgent.position.y + 28; // Mid-height
    const endX = startX + 100; // 100px to the right
    
    return (
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        className="overflow-visible"
      >
        <path
          d={`M${startX},${startY} L${endX},${startY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5,5"
          className="text-green-500 dark:text-green-400"
        />
      </svg>
    );
  };

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
      
      {/* Render connection lines */}
      {renderConnections()}
      
      {/* Render active connection if creating */}
      {renderActiveConnection()}
      
      {/* Display added agents */}
      {agents.map((agent) => (
        <AgentNode
          key={agent.id}
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          onClick={() => onAgentSelect(agent)}
          isCreatingConnection={isCreatingConnection}
          onConnectionPointClick={onConnectionPointClick}
          onDragEnd={handleAgentDragEnd}
        />
      ))}
    </div>
  );
};

export default Canvas; 