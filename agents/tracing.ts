import { v4 as uuidv4 } from 'uuid';

// Check if tracing is globally disabled via environment variable
export const isTracingGloballyDisabled = (): boolean => {
  return process.env.OPENAI_AGENTS_DISABLE_TRACING === '1';
};

// Types for tracing
export interface TraceMetadata {
  [key: string]: any;
}

export interface Trace {
  workflow_name: string;
  trace_id: string;
  group_id?: string;
  disabled: boolean;
  metadata?: TraceMetadata;
  spans: Span[];
  started_at: Date;
  ended_at?: Date;
}

export interface Span {
  span_id: string;
  trace_id: string;
  parent_id?: string;
  name: string;
  span_type: SpanType;
  span_data: SpanData;
  started_at: Date;
  ended_at?: Date;
}

export enum SpanType {
  AGENT = 'agent',
  GENERATION = 'generation',
  FUNCTION = 'function',
  GUARDRAIL = 'guardrail',
  HANDOFF = 'handoff',
  CUSTOM = 'custom'
}

export interface SpanData {
  [key: string]: any;
}

export interface AgentSpanData extends SpanData {
  agent_name: string;
  agent_instructions?: string;
  input?: string;
  output?: string;
}

export interface GenerationSpanData extends SpanData {
  model: string;
  input?: string;
  output?: string;
  tokens?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface FunctionSpanData extends SpanData {
  function_name: string;
  arguments?: any;
  result?: any;
}

export interface RunConfig {
  workflow_name?: string;
  trace_id?: string;
  group_id?: string;
  tracing_disabled?: boolean;
  trace_include_sensitive_data?: boolean;
  metadata?: TraceMetadata;
}

// Current trace and span context (using contextual variables)
let currentTrace: Trace | null = null;
let currentSpan: Span | null = null;
let tracingDisabled = false;
let includeSensitiveData = true;

// Trace processor interface
export interface TraceProcessor {
  processTrace(trace: Trace): Promise<void>;
}

// Default trace processor that logs to console
class ConsoleTraceProcessor implements TraceProcessor {
  async processTrace(trace: Trace): Promise<void> {
    if (trace.disabled) return;
    
    console.log('Trace:', {
      workflow_name: trace.workflow_name,
      trace_id: trace.trace_id,
      group_id: trace.group_id,
      span_count: trace.spans.length,
      duration_ms: trace.ended_at ? trace.ended_at.getTime() - trace.started_at.getTime() : 'ongoing',
      metadata: trace.metadata
    });
  }
}

// List of trace processors
const traceProcessors: TraceProcessor[] = [new ConsoleTraceProcessor()];

/**
 * Set the trace processors to use
 */
export function setTraceProcessors(processors: TraceProcessor[]): void {
  traceProcessors.length = 0;
  processors.forEach(processor => traceProcessors.push(processor));
}

/**
 * Add a trace processor
 */
export function addTraceProcessor(processor: TraceProcessor): void {
  traceProcessors.push(processor);
}

/**
 * Process a trace through all registered processors
 */
async function processTrace(trace: Trace): Promise<void> {
  if (trace.disabled) return;
  
  for (const processor of traceProcessors) {
    try {
      await processor.processTrace(trace);
    } catch (error) {
      console.error('Error processing trace:', error);
    }
  }
}

/**
 * Create a new trace
 */
export function trace(
  workflowName: string, 
  config?: Partial<RunConfig>
): { 
  start: (opts?: { mark_as_current?: boolean }) => Trace; 
  finish: (opts?: { reset_current?: boolean }) => Promise<void>;
} {
  // Check if tracing is disabled globally
  if (isTracingGloballyDisabled() || config?.tracing_disabled) {
    const disabledTrace: Trace = {
      workflow_name: workflowName,
      trace_id: `trace_${uuidv4().replace(/-/g, '')}`,
      disabled: true,
      spans: [],
      started_at: new Date(),
    };
    
    return {
      start: () => disabledTrace,
      finish: async () => {/* Do nothing */}
    };
  }
  
  const traceId = config?.trace_id || `trace_${uuidv4().replace(/-/g, '')}`;
  
  const newTrace: Trace = {
    workflow_name: workflowName,
    trace_id: traceId,
    group_id: config?.group_id,
    disabled: false,
    metadata: config?.metadata,
    spans: [],
    started_at: new Date(),
  };
  
  return {
    start: (opts = { mark_as_current: true }) => {
      if (opts.mark_as_current) {
        currentTrace = newTrace;
      }
      return newTrace;
    },
    finish: async (opts = { reset_current: true }) => {
      newTrace.ended_at = new Date();
      
      if (opts.reset_current && currentTrace?.trace_id === newTrace.trace_id) {
        currentTrace = null;
      }
      
      // Process the trace through all processors
      await processTrace(newTrace);
    }
  };
}

/**
 * Create and start a span
 */
function createSpan(
  name: string,
  spanType: SpanType,
  spanData: SpanData
): Span {
  const span: Span = {
    span_id: uuidv4(),
    trace_id: currentTrace?.trace_id || `trace_${uuidv4().replace(/-/g, '')}`,
    parent_id: currentSpan?.span_id,
    name,
    span_type: spanType,
    span_data: spanData,
    started_at: new Date(),
  };
  
  // Add to current trace if one exists
  if (currentTrace && !currentTrace.disabled) {
    currentTrace.spans.push(span);
  }
  
  return span;
}

/**
 * Create a context manager for a span
 */
function createSpanContextManager(
  name: string,
  spanType: SpanType,
  spanData: SpanData
) {
  // Check if tracing is disabled
  if (isTracingGloballyDisabled() || tracingDisabled || !currentTrace || currentTrace.disabled) {
    // Return no-op context manager
    return {
      enter: () => null,
      exit: () => {},
    };
  }
  
  const span = createSpan(name, spanType, spanData);
  const previousSpan = currentSpan;
  
  return {
    enter: () => {
      currentSpan = span;
      return span;
    },
    exit: () => {
      span.ended_at = new Date();
      currentSpan = previousSpan;
    },
  };
}

/**
 * Create an agent span
 */
export function agent_span(
  name: string,
  data: AgentSpanData
) {
  // Optionally remove sensitive data
  if (!includeSensitiveData) {
    // Create a new object without sensitive fields
    const sanitizedData = { ...data };
    delete sanitizedData.input;
    delete sanitizedData.output;
    return createSpanContextManager(name, SpanType.AGENT, sanitizedData);
  }
  
  return createSpanContextManager(name, SpanType.AGENT, data);
}

/**
 * Create a generation span
 */
export function generation_span(
  name: string,
  data: GenerationSpanData
) {
  // Optionally remove sensitive data
  if (!includeSensitiveData) {
    // Create a new object without sensitive fields
    const sanitizedData = { ...data };
    delete sanitizedData.input;
    delete sanitizedData.output;
    return createSpanContextManager(name, SpanType.GENERATION, sanitizedData);
  }
  
  return createSpanContextManager(name, SpanType.GENERATION, data);
}

/**
 * Create a function span
 */
export function function_span(
  name: string,
  data: FunctionSpanData
) {
  // Optionally remove sensitive data
  if (!includeSensitiveData) {
    // Create a new object without sensitive fields
    const sanitizedData = { ...data };
    delete sanitizedData.arguments;
    delete sanitizedData.result;
    return createSpanContextManager(name, SpanType.FUNCTION, sanitizedData);
  }
  
  return createSpanContextManager(name, SpanType.FUNCTION, data);
}

/**
 * Create a custom span
 */
export function custom_span(
  name: string,
  data: SpanData
) {
  return createSpanContextManager(name, SpanType.CUSTOM, data);
}

/**
 * Configure tracing for a run
 */
export function configureTracing(config?: RunConfig): void {
  if (config) {
    tracingDisabled = isTracingGloballyDisabled() || !!config.tracing_disabled;
    includeSensitiveData = config.trace_include_sensitive_data !== false;
  }
}

/**
 * Use a trace as a context manager
 */
export class TraceContextManager {
  private traceObj: ReturnType<typeof trace>;
  private trace: Trace | null = null;
  
  constructor(workflowName: string, config?: Partial<RunConfig>) {
    this.traceObj = trace(workflowName, config);
  }
  
  async enter(): Promise<Trace> {
    this.trace = this.traceObj.start();
    return this.trace;
  }
  
  async exit(): Promise<void> {
    await this.traceObj.finish();
  }
} 