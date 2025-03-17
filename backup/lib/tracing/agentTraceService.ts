import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { Trace, Span, SpanType, TraceProcessor, configureTracing } from '@/agents/tracing';
import { SupabaseTraceProcessor } from './supabaseTraceProcessor';
import { Database } from '@/types/supabase';

// Type definitions for UI-friendly trace data
export interface AgentTraceUI {
  id: string;
  workflowName: string;
  traceId: string;
  groupId?: string;
  status: 'running' | 'completed' | 'error';
  startedAt: Date;
  endedAt?: Date;
  spans: AgentTraceSpanUI[];
  metadata?: Record<string, any>;
}

export interface AgentTraceSpanUI {
  id: string;
  spanId: string;
  traceId: string;
  parentId?: string;
  name: string;
  type: SpanType;
  data: Record<string, any>;
  startedAt: Date;
  endedAt?: Date;
  children?: AgentTraceSpanUI[];
}

// In-memory store for active traces
const activeTraces = new Map<string, AgentTraceUI>();

// Store for trace event listeners
const traceEventListeners = new Map<string, Set<(trace: AgentTraceUI) => void>>();

// Initialize Supabase client
let supabase: ReturnType<typeof createClient<Database>> | null = null;

// Initialize the Supabase trace processor
let supabaseTraceProcessor: SupabaseTraceProcessor | null = null;

/**
 * Initialize the agent trace service
 */
export function initializeAgentTraceService(): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or key not found. Agent tracing will not be persisted.');
    return;
  }

  // Initialize Supabase client
  supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Initialize the Supabase trace processor
  supabaseTraceProcessor = new SupabaseTraceProcessor(supabaseUrl, supabaseKey);

  // Configure tracing to use our Supabase processor
  configureTracing();

  // Set up real-time subscriptions for trace updates
  setupRealtimeSubscriptions();

  console.log('Agent trace service initialized');
}

/**
 * Set up real-time subscriptions for trace updates
 */
function setupRealtimeSubscriptions(): void {
  if (!supabase) return;

  // Subscribe to agent_trace table changes
  supabase
    .channel('agent_trace_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'agent_trace' },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const traceId = payload.new.trace_id;
          await refreshTrace(traceId);
        }
      }
    )
    .subscribe();

  // Subscribe to agent_trace_span table changes
  supabase
    .channel('agent_trace_span_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'agent_trace_span' },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const traceId = payload.new.trace_id;
          await refreshTrace(traceId);
        }
      }
    )
    .subscribe();
}

/**
 * Refresh a trace from the database
 */
async function refreshTrace(traceId: string): Promise<void> {
  if (!supabase) return;

  try {
    // Fetch the trace
    const { data: traceData, error: traceError } = await supabase
      .from('agent_trace')
      .select('*')
      .eq('trace_id', traceId)
      .single();

    if (traceError || !traceData) {
      console.error('Error fetching trace:', traceError);
      return;
    }

    // Fetch all spans for this trace
    const { data: spanData, error: spanError } = await supabase
      .from('agent_trace_span')
      .select('*')
      .eq('trace_id', traceId);

    if (spanError) {
      console.error('Error fetching spans:', spanError);
      return;
    }

    // Convert to UI-friendly format
    const spans: AgentTraceSpanUI[] = (spanData || []).map(span => ({
      id: span.id,
      spanId: span.span_id,
      traceId: span.trace_id,
      parentId: span.parent_id || undefined,
      name: span.name,
      type: span.span_type as SpanType,
      data: span.span_data as Record<string, any>,
      startedAt: new Date(span.started_at),
      endedAt: span.ended_at ? new Date(span.ended_at) : undefined
    }));

    // Build the trace object
    const trace: AgentTraceUI = {
      id: traceData.id,
      workflowName: traceData.workflow_name,
      traceId: traceData.trace_id,
      groupId: traceData.group_id || undefined,
      status: traceData.status as 'running' | 'completed' | 'error',
      startedAt: new Date(traceData.started_at),
      endedAt: traceData.ended_at ? new Date(traceData.ended_at) : undefined,
      spans: buildSpanHierarchy(spans),
      metadata: traceData.metadata as Record<string, any> || undefined
    };

    // Update the active trace
    activeTraces.set(traceId, trace);

    // Notify listeners
    notifyTraceListeners(traceId, trace);
  } catch (error) {
    console.error('Error refreshing trace:', error);
  }
}

/**
 * Build a hierarchical structure of spans
 */
function buildSpanHierarchy(spans: AgentTraceSpanUI[]): AgentTraceSpanUI[] {
  const spanMap = new Map<string, AgentTraceSpanUI>();
  const rootSpans: AgentTraceSpanUI[] = [];

  // First pass: add all spans to the map
  spans.forEach(span => {
    spanMap.set(span.spanId, { ...span, children: [] });
  });

  // Second pass: build the hierarchy
  spans.forEach(span => {
    const spanWithChildren = spanMap.get(span.spanId)!;
    
    if (span.parentId && spanMap.has(span.parentId)) {
      // This is a child span, add it to its parent
      const parent = spanMap.get(span.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(spanWithChildren);
    } else {
      // This is a root span
      rootSpans.push(spanWithChildren);
    }
  });

  return rootSpans;
}

/**
 * Subscribe to trace updates
 */
export function subscribeToTraceUpdates(
  traceId: string,
  callback: (trace: AgentTraceUI) => void
): () => void {
  // Get or create the set of listeners for this trace
  if (!traceEventListeners.has(traceId)) {
    traceEventListeners.set(traceId, new Set());
  }

  const listeners = traceEventListeners.get(traceId)!;
  listeners.add(callback);

  // If we already have this trace, notify immediately
  const trace = activeTraces.get(traceId);
  if (trace) {
    callback(trace);
  } else {
    // Otherwise, try to fetch it
    refreshTrace(traceId).catch(error => {
      console.error('Error fetching trace for subscription:', error);
    });
  }

  // Return an unsubscribe function
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
 * Notify all listeners for a trace
 */
function notifyTraceListeners(traceId: string, trace: AgentTraceUI): void {
  const listeners = traceEventListeners.get(traceId);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(trace);
      } catch (error) {
        console.error('Error in trace listener callback:', error);
      }
    });
  }
}

/**
 * Get all traces for a user
 */
export async function getUserTraces(userId: string): Promise<AgentTraceUI[]> {
  if (!supabase) {
    return Array.from(activeTraces.values());
  }

  try {
    // Fetch all traces for this user
    const { data: traceData, error: traceError } = await supabase
      .from('agent_trace')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (traceError) {
      console.error('Error fetching user traces:', traceError);
      return [];
    }

    // Fetch spans for these traces
    const traceIds = traceData.map(trace => trace.trace_id);
    const { data: spanData, error: spanError } = await supabase
      .from('agent_trace_span')
      .select('*')
      .in('trace_id', traceIds);

    if (spanError) {
      console.error('Error fetching spans for user traces:', spanError);
      return [];
    }

    // Group spans by trace_id
    const spansByTrace = new Map<string, AgentTraceSpanUI[]>();
    (spanData || []).forEach(span => {
      if (!spansByTrace.has(span.trace_id)) {
        spansByTrace.set(span.trace_id, []);
      }
      
      spansByTrace.get(span.trace_id)!.push({
        id: span.id,
        spanId: span.span_id,
        traceId: span.trace_id,
        parentId: span.parent_id || undefined,
        name: span.name,
        type: span.span_type as SpanType,
        data: span.span_data as Record<string, any>,
        startedAt: new Date(span.started_at),
        endedAt: span.ended_at ? new Date(span.ended_at) : undefined
      });
    });

    // Build trace objects
    return traceData.map(trace => {
      const spans = spansByTrace.get(trace.trace_id) || [];
      const traceObj: AgentTraceUI = {
        id: trace.id,
        workflowName: trace.workflow_name,
        traceId: trace.trace_id,
        groupId: trace.group_id || undefined,
        status: trace.status as 'running' | 'completed' | 'error',
        startedAt: new Date(trace.started_at),
        endedAt: trace.ended_at ? new Date(trace.ended_at) : undefined,
        spans: buildSpanHierarchy(spans),
        metadata: trace.metadata as Record<string, any> || undefined
      };
      
      // Update the active traces map
      activeTraces.set(trace.trace_id, traceObj);
      
      return traceObj;
    });
  } catch (error) {
    console.error('Error getting user traces:', error);
    return [];
  }
}

/**
 * Get a trace by ID
 */
export async function getTraceById(traceId: string): Promise<AgentTraceUI | null> {
  // Check if we have it in memory first
  if (activeTraces.has(traceId)) {
    return activeTraces.get(traceId)!;
  }

  if (!supabase) {
    return null;
  }

  try {
    await refreshTrace(traceId);
    return activeTraces.get(traceId) || null;
  } catch (error) {
    console.error('Error getting trace by ID:', error);
    return null;
  }
} 