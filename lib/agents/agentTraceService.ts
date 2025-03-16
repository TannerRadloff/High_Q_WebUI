import { v4 as uuidv4 } from 'uuid';
import { AgentTrace, AgentTraceStep } from '@/src/components/features/agent-trace-panel';

// In-memory store for active agent traces
// In a production app, this would likely be replaced with a database or Redis
const activeTraces = new Map<string, AgentTrace>();

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
  
  // To handle memory cleanup in development, we'll automatically remove
  // traces after 30 minutes
  setTimeout(() => {
    if (activeTraces.has(traceId)) {
      activeTraces.delete(traceId);
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
  return activeTraces.delete(traceId);
} 