import { useState } from 'react';
import { Task } from '@/hooks/use-chat';

interface TaskSidebarProps {
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onAddInstruction?: (taskId: string, instruction: string) => void;
  onRedirectTask?: (taskId: string, newAgent: string) => void;
  onStopTask?: (taskId: string) => void;
}

export function TaskSidebar({ 
  tasks, 
  isOpen, 
  onClose,
  onAddInstruction,
  onRedirectTask,
  onStopTask
}: TaskSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 z-40 h-screen w-80 bg-white shadow-lg transition-transform duration-300 ease-in-out border-l border-gray-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Agent Tasks</h2>
        <button 
          onClick={onClose}
          className="rounded-full p-2 hover:bg-gray-100"
          aria-label="Close sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-gray-500">No active tasks</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onAddInstruction={onAddInstruction}
                onRedirectTask={onRedirectTask}
                onStopTask={onStopTask}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onAddInstruction?: (taskId: string, instruction: string) => void;
  onRedirectTask?: (taskId: string, newAgent: string) => void;
  onStopTask?: (taskId: string) => void;
}

function TaskItem({ task, onAddInstruction, onRedirectTask, onStopTask }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [showAgentSelect, setShowAgentSelect] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(task.agent || '');
  
  const availableAgents = [
    'ResearchAgent',
    'CodingAgent',
    'DataAnalysisAgent',
    'WritingAgent'
  ];
  
  const handleAddInstruction = () => {
    if (instruction.trim() && onAddInstruction) {
      onAddInstruction(task.id, instruction);
      setInstruction('');
    }
  };
  
  const handleRedirectTask = () => {
    if (selectedAgent && onRedirectTask) {
      onRedirectTask(task.id, selectedAgent);
      setShowAgentSelect(false);
    }
  };
  
  const handleStopTask = () => {
    if (onStopTask) {
      onStopTask(task.id);
    }
  };
  
  const isActiveTask = task.status === 'queued' || task.status === 'in_progress';
  
  return (
    <li className="p-4 hover:bg-gray-50 transition-colors duration-150">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="mr-2 text-gray-500 hover:text-gray-700"
              aria-label={expanded ? "Collapse task" : "Expand task"}
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
                className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <div>
              <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
              <p className="text-sm text-gray-500 truncate">{task.description}</p>
            </div>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>
      
      {expanded && (
        <div className="mt-3 pl-6 space-y-3">
          {task.agent && (
            <div className="flex items-center text-sm">
              <span className="text-gray-500 mr-2">Agent:</span>
              <span className="font-medium">{task.agent.replace('_', ' ')}</span>
            </div>
          )}
          
          {task.result && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">Result:</span>
              <p className="text-gray-700 bg-gray-50 p-2 rounded-md max-h-24 overflow-y-auto">
                {task.result}
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            Created: {task.createdAt.toLocaleString()}
          </div>
          
          {isActiveTask && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {/* Add instruction */}
              <div>
                <label htmlFor={`instruction-${task.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                  Add instruction
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id={`instruction-${task.id}`}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional instruction..."
                  />
                  <button
                    type="button"
                    onClick={handleAddInstruction}
                    disabled={!instruction.trim()}
                    className="inline-flex items-center px-2.5 py-1.5 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
              
              {/* Redirect task */}
              <div>
                {showAgentSelect ? (
                  <div className="space-y-1">
                    <label htmlFor={`agent-${task.id}`} className="block text-xs font-medium text-gray-700">
                      Select agent
                    </label>
                    <div className="flex">
                      <select
                        id={`agent-${task.id}`}
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="flex-1 min-w-0 block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an agent</option>
                        {availableAgents.map(agent => (
                          <option key={agent} value={agent}>{agent}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleRedirectTask}
                        disabled={!selectedAgent}
                        className="inline-flex items-center px-2.5 py-1.5 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Redirect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAgentSelect(true)}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Redirect
                  </button>
                )}
              </div>
              
              {/* Stop task */}
              <button
                type="button"
                onClick={handleStopTask}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md text-red-700 bg-white border border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop Task
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: Task['status'] }) {
  const getStatusStyles = () => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles()}`}>
      {getStatusIcon()}
      {status.replace('_', ' ')}
    </span>
  );
} 