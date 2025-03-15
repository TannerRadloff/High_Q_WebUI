'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import { 
  FiCheckCircle, 
  FiAlertCircle, 
  FiClock, 
  FiActivity,
  FiZap,
  FiSearch,
  FiCode,
  FiFileText,
  FiDatabase
} from 'react-icons/fi';

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  task: string;
  originalTask?: string;
  currentAction?: string;
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'failed' | 'error';
  progress: number;
  startTime: Date;
  endTime?: Date;
  lastUpdateTime?: Date;
  result?: string;
  icon?: string;
}

interface AgentStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentStatus[];
}

export default function AgentStatusPanel({ isOpen, onClose, agents }: AgentStatusPanelProps) {
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // Get appropriate icon for agent type
  const getAgentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'research':
        return <FiSearch className="text-blue-500" />;
      case 'code':
      case 'coding':
        return <FiCode className="text-purple-500" />;
      case 'writing':
      case 'content':
        return <FiFileText className="text-green-500" />;
      case 'data':
        return <FiDatabase className="text-amber-500" />;
      default:
        return <FiZap className="text-gray-500" />;
    }
  };

  // Get status icon based on agent status
  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'idle':
        return <FiClock className="text-gray-400" />;
      case 'working':
        return <FiActivity className="text-blue-500 animate-pulse" />;
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'error':
        return <FiAlertCircle className="text-red-500" />;
      default:
        return <FiClock className="text-gray-400" />;
    }
  };

  // Calculate time elapsed for an agent
  const getTimeElapsed = (agent: AgentStatus) => {
    const start = new Date(agent.startTime).getTime();
    const end = agent.endTime ? new Date(agent.endTime).getTime() : Date.now();
    const diff = end - start;
    
    // Format as seconds, minutes, or hours
    if (diff < 60000) {
      return `${Math.round(diff / 1000)}s`;
    } else if (diff < 3600000) {
      return `${Math.round(diff / 60000)}m`;
    } else {
      return `${Math.round(diff / 3600000)}h ${Math.round((diff % 3600000) / 60000)}m`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed right-0 top-0 bottom-0 w-80 md:w-96 bg-white dark:bg-slate-900 shadow-xl z-50 border-l border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-lg">Active Agents</h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close panel"
            >
              <IoClose size={20} />
            </button>
          </div>
          
          {/* Agent list */}
          <div className="flex-grow overflow-y-auto p-2">
            {agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
                <FiZap size={32} className="mb-4 opacity-40" />
                <p>No agents are currently active.</p>
                <p className="text-sm mt-2">When you use the chat, agents will appear here.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <div 
                      onClick={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-all duration-200
                        ${expandedAgentId === agent.id ? 
                          'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 
                          'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'}
                        border border-slate-200 dark:border-slate-700
                      `}
                    >
                      {/* Agent summary row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            {getAgentIcon(agent.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{agent.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{agent.task}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(agent.status)}
                          <span className="text-xs text-slate-500 dark:text-slate-400">{getTimeElapsed(agent)}</span>
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {expandedAgentId === agent.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700"
                        >
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium mb-1">Task</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300">{agent.task}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium mb-1">Status</p>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(agent.status)}
                                <span className="text-sm capitalize">{agent.status}</span>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium mb-1">Progress</p>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    agent.status === 'error' ? 'bg-red-500' : 
                                    agent.status === 'completed' ? 'bg-green-500' : 
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${agent.progress}%` }}
                                />
                              </div>
                            </div>
                            
                            {agent.result && (
                              <div>
                                <p className="text-xs font-medium mb-1">Result</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{agent.result}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-xs text-center text-slate-500">
            Agent workflow powered by AI
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 