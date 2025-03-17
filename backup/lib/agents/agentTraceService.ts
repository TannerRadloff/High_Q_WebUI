import { v4 as uuidv4 } from 'uuid';
import { AgentTrace, AgentTraceStep } from '@/src/components/features/agent-trace-panel';
import { db } from '@/lib/db/index';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// In-memory store for active agent traces
// In a production app, this would likely be replaced with a database or Redis
const activeTraces = new Map<string, AgentTrace>();

// Store for trace event listeners
const traceEventListeners = new Map<string, Set<(trace: AgentTrace) => void>>();

/**
 * Database trace processor for persisting traces
 */
export class DatabaseTraceProcessor {
  async processTrace(trace: AgentTrace): Promise<void> {
    try {
      // Check if trace already exists in the database
      const existingTrace = await db.query.agentTrace.findFirst({
        where: (fields) => eq(fields.id, trace.id)
      });
      
      if (existingTrace) {
        // Update existing trace
        await db.update(schema.agentTrace)
          .set({
            status: trace.status,
            endTime: trace.endTime,
            reasoning: trace.reasoning
          })
          .where(eq(schema.agentTrace.id, trace.id));
      } else {
        // Insert new trace
        await db.insert(schema.agentTrace).values({
          id: trace.id,
          agentId: trace.agentId,
          agentName: trace.agentName,
          agentIcon: trace.agentIcon,
          query: trace.query,
          startTime: trace.startTime,
          endTime: trace.endTime,
          status: trace.status,
          reasoning: trace.reasoning,
          createdAt: new Date()
        });
      }
      
      // Process steps
      for (const step of trace.steps) {
        // Check if step already exists
        const existingStep = await db.query.agentTraceStep.findFirst({
          where: (fields) => eq(fields.id, step.id)
        });
        
        if (existingStep) {
          // Update existing step
          await db.update(schema.agentTraceStep)
            .set({
              content: step.content,
              status: step.status,
              metadata: step.metadata
            })
            .where(eq(schema.agentTraceStep.id, step.id));
        } else {
          // Insert new step
          await db.insert(schema.agentTraceStep).values({
            id: step.id,
            traceId: trace.id,
            agentId: step.agentId,
            agentName: step.agentName,
            timestamp: step.timestamp,
            type: step.type,
            content: step.content,
            metadata: step.metadata,
            status: step.status || 'completed',
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error persisting trace to database:', error);
    }
  }
}

// Initialize the database trace processor
const dbTraceProcessor = new DatabaseTraceProcessor();

/**
 * Creates a new agent trace and stores it in memory
 */
export function createAgentTrace(
  agentId: string,
  agentName: string,
  agentIcon: string,
  query: string
): AgentTrace {
  const traceId = uuidv4();
  const trace: AgentTrace = {
    id: traceId,
    agentId,
    agentName,
    agentIcon,
    query,
    startTime: new Date(),
    steps: [],
    status: 'running',
  };
  
  activeTraces.set(traceId, trace);
  
  // Notify listeners
  notifyTraceListeners(traceId, trace);
  
  // Persist to database
  dbTraceProcessor.processTrace(trace).catch(err => {
    console.error('Failed to persist trace to database:', err);
  });
  
  // To handle memory cleanup in development, we'll automatically remove
  // traces after 30 minutes
  setTimeout(() => {
    if (activeTraces.has(traceId)) {
      activeTraces.delete(traceId);
      // Clean up listeners
      traceEventListeners.delete(traceId);
    }
  }, 30 * 60 * 1000);
  
  return trace;
}

/**
 * Adds a step to an existing agent trace
 */
export function addTraceStep(
  traceId: string,
  type: AgentTraceStep['type'],
  content: string,
  metadata?: Record<string, any>,
  status: AgentTraceStep['status'] = 'completed'
): AgentTraceStep | null {
  const trace = activeTraces.get(traceId);
  if (!trace) return null;
  
  const step: AgentTraceStep = {
    id: uuidv4(),
    agentId: trace.agentId,
    agentName: trace.agentName,
    timestamp: new Date(),
    type,
    content,
    metadata,
    status,
  };
  
  trace.steps.push(step);
  
  // Notify listeners of the updated trace
  notifyTraceListeners(traceId, trace);
  
  // Persist to database
  dbTraceProcessor.processTrace(trace).catch(err => {
    console.error('Failed to persist trace step to database:', err);
  });
  
  return step;
}

/**
 * Updates the status of an agent trace step
 */
export function updateTraceStepStatus(
  traceId: string,
  stepId: string,
  status: AgentTraceStep['status']
): boolean {
  const trace = activeTraces.get(traceId);
  if (!trace) return false;
  
  const step = trace.steps.find(s => s.id === stepId);
  if (!step) return false;
  
  step.status = status;
  
  // Notify listeners of the updated trace
  notifyTraceListeners(traceId, trace);
  
  // Persist to database
  dbTraceProcessor.processTrace(trace).catch(err => {
    console.error('Failed to persist trace step status update to database:', err);
  });
  
  return true;
}

/**
 * Completes an agent trace
 */
export function completeAgentTrace(
  traceId: string,
  success: boolean = true,
  reasoning?: string
): boolean {
  const trace = activeTraces.get(traceId);
  if (!trace) return false;
  
  trace.status = success ? 'completed' : 'error';
  trace.endTime = new Date();
  if (reasoning) {
    trace.reasoning = reasoning;
  }
  
  // Notify listeners of the updated trace
  notifyTraceListeners(traceId, trace);
  
  // Persist to database
  dbTraceProcessor.processTrace(trace).catch(err => {
    console.error('Failed to persist trace completion to database:', err);
  });
  
  return true;
}

/**
 * Retrieves an agent trace by ID
 */
export function getAgentTrace(traceId: string): AgentTrace | null {
  return activeTraces.get(traceId) || null;
}

/**
 * Gets all active agent traces
 */
export function getAllActiveTraces(): AgentTrace[] {
  return Array.from(activeTraces.values());
}

/**
 * Gets all agent traces for a specific agent
 */
export function getAgentTracesByAgentId(agentId: string): AgentTrace[] {
  return Array.from(activeTraces.values()).filter(
    trace => trace.agentId === agentId
  );
}

/**
 * Deletes an agent trace
 */
export function deleteAgentTrace(traceId: string): boolean {
  const result = activeTraces.delete(traceId);
  
  // Clean up listeners
  traceEventListeners.delete(traceId);
  
  return result;
}

/**
 * Subscribe to trace updates
 * Returns an unsubscribe function
 */
export function subscribeToTraceUpdates(
  traceId: string,
  callback: (trace: AgentTrace) => void
): () => void {
  if (!traceEventListeners.has(traceId)) {
    traceEventListeners.set(traceId, new Set());
  }
  
  const listeners = traceEventListeners.get(traceId)!;
  listeners.add(callback);
  
  // If the trace already exists, immediately notify with current state
  const trace = activeTraces.get(traceId);
  if (trace) {
    callback(trace);
  }
  
  // Return unsubscribe function
  return () => {
    const listeners = traceEventListeners.get(traceId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        traceEventListeners.delete(traceId);
      }
    }
  };
}

/**
 * Notify all listeners of trace updates
 */
function notifyTraceListeners(traceId: string, trace: AgentTrace): void {
  const listeners = traceEventListeners.get(traceId);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback({ ...trace, steps: [...trace.steps] });
      } catch (error) {
        console.error('Error in trace listener:', error);
      }
    });
  }
}

/**
 * Add a streaming step to a trace that will be updated as content arrives
 * Returns a function to update the step content and a function to complete the step
 */
export function addStreamingTraceStep(
  traceId: string,
  type: AgentTraceStep['type'],
  initialContent: string = '',
  metadata?: Record<string, any>
): { 
  stepId: string, 
  updateContent: (content: string) => void, 
  completeStep: (finalContent?: string) => void 
} {
  const trace = activeTraces.get(traceId);
  if (!trace) {
    throw new Error(`Trace with ID ${traceId} not found`);
  }
  
  const stepId = uuidv4();
  const step: AgentTraceStep = {
    id: stepId,
    agentId: trace.agentId,
    agentName: trace.agentName,
    timestamp: new Date(),
    type,
    content: initialContent,
    metadata,
    status: 'in-progress',
  };
  
  trace.steps.push(step);
  
  // Notify listeners of the updated trace
  notifyTraceListeners(traceId, trace);
  
  // Persist to database
  dbTraceProcessor.processTrace(trace).catch(err => {
    console.error('Failed to persist streaming trace step to database:', err);
  });
  
  // Return functions to update and complete the step
  return {
    stepId,
    updateContent: (content: string) => {
      const trace = activeTraces.get(traceId);
      if (!trace) return;
      
      const step = trace.steps.find(s => s.id === stepId);
      if (!step) return;
      
      step.content = content;
      
      // Notify listeners of the updated trace
      notifyTraceListeners(traceId, trace);
      
      // Persist to database
      dbTraceProcessor.processTrace(trace).catch(err => {
        console.error('Failed to persist trace step content update to database:', err);
      });
    },
    completeStep: (finalContent?: string) => {
      const trace = activeTraces.get(traceId);
      if (!trace) return;
      
      const step = trace.steps.find(s => s.id === stepId);
      if (!step) return;
      
      if (finalContent !== undefined) {
        step.content = finalContent;
      }
      
      step.status = 'completed';
      
      // Notify listeners of the updated trace
      notifyTraceListeners(traceId, trace);
      
      // Persist to database
      dbTraceProcessor.processTrace(trace).catch(err => {
        console.error('Failed to persist trace step completion to database:', err);
      });
    }
  };
} 