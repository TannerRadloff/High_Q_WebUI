import React from 'react';
import { motion } from 'framer-motion';

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  icon: string;
  originalTask: string;
  currentAction: string;
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'failed';
  progress: number; // 0-100
  startTime: Date;
  lastUpdateTime: Date;
}

interface AgentStatusPanelProps {
  agents: AgentStatus[];
  isOpen: boolean;
  onToggle: () => void;
}

const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({ agents, isOpen, onToggle }) => {
  // Sort agents by lastUpdateTime (most recent first)
  const sortedAgents = [...agents].sort((a, b) => 
    new Date(b.lastUpdateTime).getTime() - new Date(a.lastUpdateTime).getTime()
  );

  // Get status color and label based on agent status
  const getStatusInfo = (status: AgentStatus['status']) => {
    switch (status) {
      case 'idle':
        return { color: 'bg-slate-400', label: 'Idle' };
      case 'working':
        return { color: 'bg-green-500', label: 'Working' };
      case 'waiting':
        return { color: 'bg-yellow-500', label: 'Waiting' };
      case 'completed':
        return { color: 'bg-blue-500', label: 'Completed' };
      case 'failed':
        return { color: 'bg-red-500', label: 'Failed' };
      default:
        return { color: 'bg-slate-400', label: 'Unknown' };
    }
  };

  // Format time elapsed since agent started
  const formatTimeElapsed = (startTime: Date) => {
    const now = new Date();
    const elapsedMs = now.getTime() - new Date(startTime).getTime();
    const seconds = Math.floor(elapsedMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  return (
    <motion.div 
      className={`fixed bottom-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-lg rounded-tl-lg border-l border-t border-slate-200 dark:border-slate-800 overflow-hidden z-10`}
      initial="closed"
      animate={isOpen ? "open" : "closed"}
      variants={{
        open: { height: 'auto', maxHeight: '70vh' },
        closed: { height: '36px', maxHeight: '36px' }
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Panel header */}
      <div 
        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 flex justify-between items-center cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <span className="text-sm font-medium">Active Agents</span>
          {agents.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">{agents.length}</span>
          )}
        </div>
        <button 
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          aria-label={isOpen ? "Close agent status panel" : "Open agent status panel"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      </div>

      {/* Agents list */}
      <div className="overflow-y-auto max-h-[calc(70vh-36px)]">
        {agents.length === 0 ? (
          <div className="py-6 px-4 text-center text-slate-500 dark:text-slate-400">
            <p>No active agents</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sortedAgents.map(agent => {
              const { color, label } = getStatusInfo(agent.status);
              return (
                <div 
                  key={agent.id} 
                  className="p-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start">
                    <div className="text-2xl mr-3" role="img" aria-label={`${agent.name} icon`}>
                      {agent.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-sm">{agent.name}</h3>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${color}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        <span className="font-medium">Task:</span> {agent.originalTask}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        <span className="font-medium">Current:</span> {agent.currentAction}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${agent.progress}%` }}
                        />
                      </div>
                      
                      {/* Time elapsed */}
                      <p className="text-xs text-right mt-1 text-slate-400 dark:text-slate-500">
                        {formatTimeElapsed(agent.startTime)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AgentStatusPanel; 