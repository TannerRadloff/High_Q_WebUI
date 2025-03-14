import React from 'react';
import { Agent, AgentType } from './types';

interface AgentNodeProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * AgentNode - A component representing an agent placed on the canvas
 */
const AgentNode: React.FC<AgentNodeProps> = ({ agent, isSelected, onClick }) => {
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

  return (
    <div
      style={{
        position: 'absolute',
        left: agent.position.x,
        top: agent.position.y,
      }}
      className={`p-4 w-48 rounded-lg shadow-md border ${getAgentStyles()} 
                ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                cursor-pointer transition-all`}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <h3 className="font-medium truncate">{agent.config.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {agent.type} Agent
        </p>
        
        {/* Connection points */}
        <div className="absolute -left-2 top-1/2 w-4 h-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full transform -translate-y-1/2"></div>
        <div className="absolute -right-2 top-1/2 w-4 h-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full transform -translate-y-1/2"></div>
      </div>
    </div>
  );
};

export default AgentNode; 