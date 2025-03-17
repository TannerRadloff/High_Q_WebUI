'use client';

import React, { useEffect } from 'react';
import { useTasks, Task } from '@/contexts/task-context';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  HourglassIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from 'lucide-react';

interface TaskListProps {
  queryId?: string;
  className?: string;
}

export function TaskList({ queryId, className = '' }: TaskListProps) {
  const { tasks, loading, error, fetchTasks } = useTasks();

  // Fetch tasks when the component mounts or queryId changes
  useEffect(() => {
    if (queryId) {
      fetchTasks(queryId);
    }
  }, [queryId, fetchTasks]);

  // Build task hierarchy
  const buildTaskTree = (tasks: Task[]) => {
    const taskMap = new Map<string, Task & { children: Task[] }>();
    
    // Initialize each task with empty children array
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });
    
    // Build tree structure
    const rootTasks: (Task & { children: Task[] })[] = [];
    
    taskMap.forEach(task => {
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        taskMap.get(task.parent_task_id)?.children.push(task);
      } else {
        rootTasks.push(task);
      }
    });
    
    return rootTasks;
  };
  
  const taskTree = buildTaskTree(tasks);
  
  // Status icons
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <HourglassIcon className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };
  
  // Status badge
  const getStatusBadge = (status: string) => {
    let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
    
    switch (status) {
      case 'queued':
        variant = 'outline';
        break;
      case 'in_progress':
        variant = 'secondary';
        break;
      case 'completed':
        variant = 'default';
        break;
      case 'error':
        variant = 'destructive';
        break;
    }
    
    return (
      <Badge variant={variant}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };
  
  // Render task with its children
  const renderTask = (task: Task & { children: Task[] }, depth = 0) => {
    const [expanded, setExpanded] = React.useState(true);
    const hasChildren = task.children.length > 0;
    
    return (
      <div key={task.id} className="mb-2">
        <div 
          className={`p-2 rounded-md border ${
            task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' : 
            task.status === 'completed' ? 'bg-green-50 border-green-200' : 
            task.status === 'error' ? 'bg-red-50 border-red-200' : 
            'bg-gray-50 border-gray-200'
          } flex items-start gap-2`}
        >
          {hasChildren && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="mt-1 p-1 hover:bg-gray-200 rounded"
            >
              {expanded ? 
                <ChevronDownIcon className="h-4 w-4" /> : 
                <ChevronRightIcon className="h-4 w-4" />
              }
            </button>
          )}
          
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{task.agent}</div>
              {getStatusBadge(task.status)}
            </div>
            <div>{task.description}</div>
            {task.result?.content && (
              <div className="mt-1 text-sm text-gray-600 max-h-20 overflow-y-auto">
                {typeof task.result.content === 'string' 
                  ? task.result.content.substring(0, 100) + (task.result.content.length > 100 ? '...' : '') 
                  : 'Result available'}
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && expanded && (
          <div className="ml-8 mt-1 pl-2 border-l-2 border-gray-200">
            {task.children.map(child => renderTask(child as Task & { children: Task[] }, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (tasks.length === 0) {
    return <div className="text-gray-500 p-2">No tasks to display</div>;
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold mb-2">Tasks</h3>
      <div className="space-y-1">
        {taskTree.map(task => renderTask(task))}
      </div>
    </div>
  );
} 