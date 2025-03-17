import React, { useState, useEffect } from 'react';
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

  // State for tracking mouse position during connection creation
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Grid size for snapping
  const gridSize = 20; // 20px grid

  // Add state for potential connection target
  const [potentialTarget, setPotentialTarget] = useState<string | null>(null);

  // Track mouse movement when creating a connection
  useEffect(() => {
    if (isCreatingConnection && connectionSource) {
      const handleMouseMove = (e: MouseEvent) => {
        const canvas = document.querySelector('[data-droppable-id="canvas"]');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
        
        // Check if mouse is over a potential connection target
        const agentNodes = document.querySelectorAll('[data-agent-id]');
        let foundTarget = null;
        
        agentNodes.forEach((node) => {
          const agentId = node.getAttribute('data-agent-id');
          if (agentId && agentId !== connectionSource) {
            const nodeRect = node.getBoundingClientRect();
            
            // Check if mouse is over this agent
            if (
              e.clientX >= nodeRect.left && 
              e.clientX <= nodeRect.right && 
              e.clientY >= nodeRect.top && 
              e.clientY <= nodeRect.bottom
            ) {
              foundTarget = agentId;
            }
          }
        });
        
        setPotentialTarget(foundTarget);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        setPotentialTarget(null);
      };
    }
  }, [isCreatingConnection, connectionSource, agents]);

  // Handle agent position update
  const handleAgentDragEnd = (agentId: string, position: { x: number; y: number }) => {
    // Snap to grid
    const snappedPosition = {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
    
    if (onAgentPositionChange) {
      onAgentPositionChange(agentId, snappedPosition);
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
          {/* Add connection label */}
          <text
            x={(startX + endX) / 2}
            y={((startY + endY) / 2) - 10}
            textAnchor="middle"
            className="text-xs fill-slate-500 dark:fill-slate-400 select-none"
          >
            {connection.label || 'Handoff'}
          </text>
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
    
    // Get start point from the source agent
    const startX = sourceAgent.position.x + 192; // End of the agent box
    const startY = sourceAgent.position.y + 28; // Mid-height
    
    // Use the current mouse position for the end point
    let endX = mousePosition.x;
    let endY = mousePosition.y;
    
    // If we have a potential target, use its position instead
    if (potentialTarget) {
      const targetAgent = agents.find(a => a.id === potentialTarget);
      if (targetAgent) {
        endX = targetAgent.position.x;
        endY = targetAgent.position.y + 28; // Mid-height
      }
    }
    
    // Create a curved path that follows the mouse
    const path = `M${startX},${startY} C${startX + 50},${startY} ${endX - 50},${endY} ${endX},${endY}`;
    
    return (
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        className="overflow-visible"
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={potentialTarget ? "0" : "5,5"}
          className={potentialTarget ? "text-blue-500 dark:text-blue-400" : "text-green-500 dark:text-green-400"}
        />
        {/* Add a small circle at the end to indicate where the connection will end */}
        <circle
          cx={endX}
          cy={endY}
          r={4}
          className={potentialTarget ? "fill-blue-500 dark:fill-blue-400" : "fill-green-500 dark:fill-green-400"}
        />
      </svg>
    );
  };

  // Render the grid pattern
  const renderGrid = () => {
    return (
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <defs>
          <pattern 
            id="grid" 
            width={gridSize} 
            height={gridSize} 
            patternUnits="userSpaceOnUse"
          >
            <path 
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-200 dark:text-slate-800"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    );
  };

  return (
    <div
      ref={setNodeRef}
      data-droppable-id="canvas"
      className={`w-full h-full border-2 border-dashed 
                 ${isOver 
                   ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30' 
                   : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'} 
                 rounded-lg overflow-hidden relative transition-colors`}
    >
      {/* Render grid pattern */}
      {renderGrid()}
      
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
          gridSize={gridSize}
          isPotentialTarget={potentialTarget === agent.id}
        />
      ))}
    </div>
  );
};

export default Canvas; 