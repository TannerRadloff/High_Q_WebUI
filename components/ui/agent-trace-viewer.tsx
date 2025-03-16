'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { X as XIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { AgentTraceUI, AgentTraceSpanUI, subscribeToTraceUpdates } from '@/lib/tracing/agentTraceService';
import { SpanType } from '@/agents/tracing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AgentTraceViewerProps {
  traceId: string;
  isVisible: boolean;
  onClose: () => void;
}

export function AgentTraceViewer({ traceId, isVisible, onClose }: AgentTraceViewerProps) {
  const [trace, setTrace] = useState<AgentTraceUI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

  // Subscribe to trace updates
  useEffect(() => {
    if (!traceId) return;

    setIsLoading(true);
    
    const unsubscribe = subscribeToTraceUpdates(traceId, (updatedTrace) => {
      setTrace(updatedTrace);
      setIsLoading(false);
      
      // Auto-expand root spans
      const newExpandedSpans = new Set(expandedSpans);
      updatedTrace.spans.forEach(span => {
        newExpandedSpans.add(span.spanId);
      });
      setExpandedSpans(newExpandedSpans);
    });
    
    return () => {
      unsubscribe();
    };
  }, [traceId]);

  // Toggle span expansion
  const toggleSpan = (spanId: string) => {
    const newExpandedSpans = new Set(expandedSpans);
    if (newExpandedSpans.has(spanId)) {
      newExpandedSpans.delete(spanId);
    } else {
      newExpandedSpans.add(spanId);
    }
    setExpandedSpans(newExpandedSpans);
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'In progress';
    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  // Get span icon based on type
  const getSpanIcon = (type: SpanType) => {
    switch (type) {
      case SpanType.AGENT:
        return <div className="w-4 h-4 rounded-full bg-blue-500" />;
      case SpanType.GENERATION:
        return <div className="w-4 h-4 rounded-full bg-purple-500" />;
      case SpanType.FUNCTION:
        return <div className="w-4 h-4 rounded-full bg-green-500" />;
      case SpanType.GUARDRAIL:
        return <div className="w-4 h-4 rounded-full bg-yellow-500" />;
      case SpanType.HANDOFF:
        return <div className="w-4 h-4 rounded-full bg-indigo-500" />;
      case SpanType.CUSTOM:
        return <div className="w-4 h-4 rounded-full bg-gray-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-500" />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: 'running' | 'completed' | 'error') => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  // Render a span and its children
  const renderSpan = (span: AgentTraceSpanUI, depth = 0) => {
    const isExpanded = expandedSpans.has(span.spanId);
    const hasChildren = span.children && span.children.length > 0;
    
    return (
      <div key={span.spanId} className="mb-1">
        <div 
          className={`flex items-start p-2 rounded-md hover:bg-muted/50 cursor-pointer ${isExpanded ? 'bg-muted/30' : ''}`}
          onClick={() => toggleSpan(span.spanId)}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <div className="flex items-center mr-2">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
          </div>
          
          <div className="mr-2 mt-1">
            {getSpanIcon(span.type)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{span.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatTime(span.startedAt)} • {formatDuration(span.startedAt, span.endedAt)}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {span.type}
              </Badge>
              
              {span.endedAt ? (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Completed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  In Progress
                </Badge>
              )}
            </div>
            
            {isExpanded && span.data && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-2 text-xs bg-muted/50 p-1.5 rounded cursor-help overflow-x-auto">
                    <pre className="text-muted-foreground">
                      {JSON.stringify(span.data, null, 2).slice(0, 100)}
                      {JSON.stringify(span.data, null, 2).length > 100 ? '...' : ''}
                    </pre>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <pre className="text-xs">
                    {JSON.stringify(span.data, null, 2)}
                  </pre>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {span.children!.map(child => renderSpan(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="border rounded-lg shadow-sm bg-background overflow-hidden"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Agent Trace</h3>
            {trace && (
              <>
                <Badge variant="outline" className="ml-2">
                  {trace.workflowName}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {getStatusIcon(trace.status)}
                  <span>{trace.status}</span>
                </div>
              </>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-[400px] overflow-y-auto">
          <div className="p-3">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
                <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
                <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
              </div>
            ) : trace ? (
              <div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">Trace ID</div>
                    <div className="text-sm text-muted-foreground">{trace.traceId}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">Started</div>
                    <div className="text-sm text-muted-foreground">{formatTime(trace.startedAt)}</div>
                  </div>
                  
                  {trace.endedAt && (
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium">Duration</div>
                      <div className="text-sm text-muted-foreground">{formatDuration(trace.startedAt, trace.endedAt)}</div>
                    </div>
                  )}
                </div>
                
                <div className="mb-2 font-medium">Spans</div>
                {trace.spans.length > 0 ? (
                  trace.spans.map(span => renderSpan(span))
                ) : (
                  <div className="text-sm text-muted-foreground">No spans available</div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trace data available
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 