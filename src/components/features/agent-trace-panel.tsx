import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconProps } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { subscribeToTraceUpdates } from '@/lib/agents/agentTraceService';

export interface AgentTraceStep {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: Date;
  type: 'thought' | 'action' | 'observation' | 'decision' | 'handoff' | 'error';
  content: string;
  metadata?: Record<string, any>;
  status?: 'completed' | 'in-progress' | 'planned';
}

export interface AgentTrace {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  query: string;
  startTime: Date;
  endTime?: Date;
  steps: AgentTraceStep[];
  status: 'running' | 'completed' | 'error';
  reasoning?: string;
}

interface AgentTracePanelProps {
  trace: AgentTrace | null;
  isVisible: boolean;
  isLoading: boolean;
  onClose: () => void;
}

// Icons for different step types
const ThoughtIcon = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const ActionIcon = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const ObservationIcon = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="2" />
    <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7" />
  </svg>
);

const DecisionIcon = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22v-9M5 10V8a7 7 0 0 1 14 0v2" />
    <circle cx="12" cy="6" r="3" />
  </svg>
);

const HandoffIcon = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 3L22 8L17 13" />
    <path d="M22 8H10" />
    <path d="M7 21L2 16L7 11" />
    <path d="M2 16H14" />
  </svg>
);

const ErrorIcon = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const getStepIcon = (type: AgentTraceStep['type'], className = "h-4 w-4") => {
  switch (type) {
    case 'thought':
      return <ThoughtIcon className={className} />;
    case 'action':
      return <ActionIcon className={className} />;
    case 'observation':
      return <ObservationIcon className={className} />;
    case 'decision':
      return <DecisionIcon className={className} />;
    case 'handoff':
      return <HandoffIcon className={className} />;
    case 'error':
      return <ErrorIcon className={className} />;
    default:
      return <ThoughtIcon className={className} />;
  }
};

const StepItem: React.FC<{ step: AgentTraceStep, isActive: boolean }> = ({ step, isActive }) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getBadgeColor = (type: AgentTraceStep['type']) => {
    switch (type) {
      case 'thought':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'action':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'observation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'decision':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'handoff':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 rounded-md border mb-2 ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-border bg-background/60'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getStepIcon(step.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`px-2 py-0.5 text-xs font-medium ${getBadgeColor(step.type)}`}>
                {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
              </Badge>
              {step.status === 'in-progress' && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  In Progress
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formatTime(step.timestamp)}</span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {step.status === 'in-progress' ? (
              <span>
                {step.content}
                <span className="inline-block animate-pulse">▌</span>
              </span>
            ) : (
              step.content
            )}
          </p>
          
          {step.metadata && Object.keys(step.metadata).length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-2 text-xs bg-muted/50 p-1.5 rounded cursor-help overflow-x-auto">
                  <pre className="text-muted-foreground">
                    {JSON.stringify(step.metadata, null, 2).slice(0, 100)}
                    {JSON.stringify(step.metadata, null, 2).length > 100 ? '...' : ''}
                  </pre>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <pre className="text-xs">
                  {JSON.stringify(step.metadata, null, 2)}
                </pre>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const LoadingTraceStep = () => (
  <div className="p-3 border border-border rounded-md mb-2 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-4 w-4 bg-muted rounded-full" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="h-4 w-full bg-muted rounded mt-2" />
        <div className="h-4 w-3/4 bg-muted rounded mt-2" />
      </div>
    </div>
  </div>
);

const AgentTracePanel: React.FC<AgentTracePanelProps> = ({ trace, isVisible, isLoading, onClose }) => {
  // State to hold the live trace data
  const [liveTrace, setLiveTrace] = useState<AgentTrace | null>(trace);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  // Subscribe to trace updates
  useEffect(() => {
    if (!trace) {
      setLiveTrace(null);
      return;
    }

    // Set initial trace
    setLiveTrace(trace);
    
    // Subscribe to updates for this trace
    const unsubscribe = subscribeToTraceUpdates(trace.id, (updatedTrace) => {
      setLiveTrace(updatedTrace);
      
      // Set the active step to the most recent in-progress step
      const inProgressStep = updatedTrace.steps.findLast(step => step.status === 'in-progress');
      if (inProgressStep) {
        setActiveStepId(inProgressStep.id);
      } else if (updatedTrace.steps.length > 0) {
        // If no in-progress steps, set the last step as active
        setActiveStepId(updatedTrace.steps[updatedTrace.steps.length - 1].id);
      }
    });
    
    // Cleanup subscription on unmount or when trace changes
    return () => {
      unsubscribe();
    };
  }, [trace]);

  if (!isVisible && !isLoading) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="trace-panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-border rounded-md mb-4 overflow-hidden bg-background/80 backdrop-blur-sm"
        >
          <div className="p-3 border-b border-border bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Agent Trace</span>
              {liveTrace?.agentName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{liveTrace.agentIcon}</span>
                    <span className="text-sm">{liveTrace.agentName}</span>
                  </div>
                </div>
              )}
              {liveTrace?.status === 'running' && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse">
                  Running
                </Badge>
              )}
              {liveTrace?.status === 'completed' && (
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Completed
                </Badge>
              )}
              {liveTrace?.status === 'error' && (
                <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Error
                </Badge>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close trace panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                <path d="M18 6L6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="p-3 max-h-[400px] overflow-y-auto">
            {isLoading && !liveTrace && (
              <>
                <LoadingTraceStep />
                <LoadingTraceStep />
                <LoadingTraceStep />
              </>
            )}
            
            {liveTrace && (
              <>
                <div className="mb-3">
                  <div className="text-sm font-medium mb-1">Query</div>
                  <div className="p-2 bg-muted/30 rounded-md text-sm">{liveTrace.query}</div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm font-medium mb-1">Steps</div>
                  <AnimatePresence initial={false}>
                    {liveTrace.steps.map((step) => (
                      <StepItem 
                        key={step.id} 
                        step={step} 
                        isActive={step.id === activeStepId}
                      />
                    ))}
                  </AnimatePresence>
                  
                  {liveTrace.status === 'running' && liveTrace.steps.length === 0 && (
                    <div className="text-sm text-muted-foreground italic">
                      Waiting for agent to start processing...
                    </div>
                  )}
                </div>
                
                {liveTrace.reasoning && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">Reasoning</div>
                    <div className="p-2 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">
                      {liveTrace.reasoning}
                    </div>
                  </div>
                )}
                
                {liveTrace.status === 'completed' && (
                  <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-md">
                    <div className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Trace completed successfully
                    </div>
                  </div>
                )}
                
                {liveTrace.status === 'error' && (
                  <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-md">
                    <div className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      Trace completed with errors
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentTracePanel; 