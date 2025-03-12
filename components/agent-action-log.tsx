import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface AgentAction {
  id: string;
  timestamp: number;
  type: 'start' | 'triage' | 'research_start' | 'research_complete' | 'report_start' | 'complete' | 'error' | 'agent' | 'generation' | 'function' | 'custom';
  message: string;
  metadata?: Record<string, any>;
}

interface AgentActionLogProps {
  actions: AgentAction[];
  maxDisplayActions?: number;
}

export function AgentActionLog({ 
  actions,
  maxDisplayActions = 6
}: AgentActionLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll to bottom when new actions arrive
  useEffect(() => {
    if (actions.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [actions]);
  
  // Calculate progress based on actions
  const progress = useMemo(() => {
    if (actions.length === 0) return 0;
    
    // Check if the process is complete
    if (actions.some(a => a.type === 'complete')) {
      return 100;
    }
    
    // Otherwise calculate based on milestones reached
    let progressValue = 0;
    
    // Start - 5%
    if (actions.some(a => a.type === 'start')) {
      progressValue += 5;
    }
    
    // Triage - 20%
    if (actions.some(a => a.type === 'triage')) {
      progressValue += 15;
    }
    
    // Research start - 30%
    if (actions.some(a => a.type === 'research_start')) {
      progressValue += 10;
    }
    
    // Research complete - 60%
    if (actions.some(a => a.type === 'research_complete')) {
      progressValue += 30;
    }
    
    // Report start - 70%
    if (actions.some(a => a.type === 'report_start')) {
      progressValue += 10;
    }
    
    // Error stops progress
    if (actions.some(a => a.type === 'error')) {
      return progressValue;
    }
    
    // If no specific milestone but processing, increment based on time elapsed
    if (progressValue === 0 && actions.length > 0) {
      const firstActionTime = actions[0].timestamp;
      const elapsed = Date.now() - firstActionTime;
      const timeBasedProgress = Math.min(90, Math.floor(elapsed / 1000)); // 1% per second up to 90%
      progressValue = Math.max(5, timeBasedProgress); // At least 5%
    }
    
    // If we have some agents working but no research complete, assume 40% max
    if (progressValue > 0 && !actions.some(a => a.type === 'research_complete')) {
      progressValue = Math.min(40, progressValue);
    }
    
    return progressValue;
  }, [actions]);
  
  // Filter actions to show only the most recent ones based on maxDisplayActions
  const visibleActions = actions.slice(-maxDisplayActions);

  return (
    <div className="w-full h-auto max-h-56 overflow-y-auto rounded-md border bg-muted/50 p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Agent Activity Log</h3>
        {actions.length > 0 && !actions.some(a => a.type === 'complete') && (
          <div className="text-xs text-muted-foreground">
            {progress}% complete
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      {actions.length > 0 && (
        <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
      
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visibleActions.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.7 }} 
              className="text-xs text-muted-foreground text-center py-4"
            >
              No agent activity yet
            </motion.div>
          )}
          {visibleActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1 - (index / (maxDisplayActions + 1)), 
                y: 0 
              }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs rounded px-2 py-1.5 flex items-start gap-2 relative"
              style={{
                backgroundColor: `rgba(var(--background-rgb), ${1 - (index / (maxDisplayActions + 2))})`
              }}
            >
              {getActionIcon(action.type)}
              <div className="flex-1">
                <div className="font-medium">{action.message}</div>
                {action.metadata && Object.keys(action.metadata).length > 0 && (
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {formatMetadata(action.metadata)}
                  </div>
                )}
              </div>
              <div className="text-muted-foreground text-[10px] self-start whitespace-nowrap">
                {formatTimestamp(action.timestamp)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

function getActionIcon(type: AgentAction['type']) {
  switch (type) {
    case 'start':
      return <span className="text-blue-500">▶️</span>;
    case 'triage':
      return <span className="text-purple-500">🔍</span>;
    case 'research_start':
      return <span className="text-amber-500"><Loader2 className="h-3 w-3 animate-spin" /></span>;
    case 'research_complete':
      return <span className="text-green-500">📚</span>;
    case 'report_start':
      return <span className="text-blue-500"><Loader2 className="h-3 w-3 animate-spin" /></span>;
    case 'complete':
      return <span className="text-green-500">✅</span>;
    case 'error':
      return <span className="text-red-500">❌</span>;
    case 'agent':
      return <span className="text-indigo-500">🤖</span>;
    case 'generation':
      return <span className="text-pink-500">🧠</span>;
    case 'function':
      return <span className="text-cyan-500">⚙️</span>;
    case 'custom':
      return <span className="text-orange-500">🔧</span>;
    default:
      return <span className="text-gray-500">•</span>;
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatMetadata(metadata: Record<string, any>): string {
  // Format metadata into a concise string representation
  const parts: string[] = [];
  
  if (metadata.taskType) {
    parts.push(`Task: ${metadata.taskType}`);
  }
  
  if (metadata.confidence) {
    parts.push(`Confidence: ${(metadata.confidence * 100).toFixed(0)}%`);
  }
  
  if (metadata.sources) {
    parts.push(`Sources: ${metadata.sources}`);
  }
  
  return parts.join(' • ');
} 