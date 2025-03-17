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

export interface HandoffSpanData extends SpanData {
  source_agent: string;
  target_agent: string;
  reason?: string;
}

/**
 * Configuration options for an agent run, fully aligned with OpenAI Agent SDK
 */
export interface RunConfig {
  // Workflow and tracing identifiers
  workflow_name?: string;
  trace_id?: string;
  group_id?: string;
  session_id?: string; // Added for SDK alignment - lets you link traces across multiple runs
  
  // Model and execution configuration
  model?: string; // Global model to use, irrespective of agent-specific models
  model_provider?: string; // Provider for looking up model names
  model_settings?: { // Override agent-specific settings
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  
  // Guardrails configuration
  input_guardrails?: any[]; // List of input guardrails to include on all runs
  output_guardrails?: any[]; // List of output guardrails to include on all runs
  
  // Handoff configuration
  handoff_input_filter?: (inputs: any) => any; // Global input filter for handoffs
  
  // Tracing configuration
  tracing_disabled?: boolean;
  trace_include_sensitive_data?: boolean;
  trace_metadata?: Record<string, any>;
  
  // Execution limits
  max_turns?: number; // Maximum turns before raising MaxTurnsExceededError
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
      spans_count: trace.spans.length,
      duration_ms: trace.ended_at 
        ? trace.ended_at.getTime() - trace.started_at.getTime() 
        : 'unfinished'
    });
  }
}

// Default trace processor
let traceProcessor: TraceProcessor = new ConsoleTraceProcessor();

/**
 * Configure tracing settings
 */
export function configureTracing(config?: RunConfig): void {
  if (config) {
    if (config.tracing_disabled !== undefined) {
      tracingDisabled = config.tracing_disabled;
    }
    
    if (config.trace_include_sensitive_data !== undefined) {
      includeSensitiveData = config.trace_include_sensitive_data;
    }
  }
}

/**
 * Create a trace
 */
export function trace(workflow_name: string, config?: RunConfig): { 
  start: () => Trace;
  finish: () => Promise<void>;
} {
  const isDisabled = tracingDisabled || isTracingGloballyDisabled() || (config?.tracing_disabled ?? false);
  
  const traceObj: Trace = {
    workflow_name,
    trace_id: config?.trace_id ?? `trace_${uuidv4().replace(/-/g, '')}`,
    group_id: config?.group_id,
    disabled: isDisabled,
    metadata: config?.trace_metadata,
    spans: [],
    started_at: new Date()
  };
  
  return {
    start: () => {
      if (!isDisabled) {
        currentTrace = traceObj;
      }
      return traceObj;
    },
    finish: async () => {
      if (isDisabled) return;
      
      traceObj.ended_at = new Date();
      
      if (currentTrace?.trace_id === traceObj.trace_id) {
        currentTrace = null;
      }
      
      try {
        await traceProcessor.processTrace(traceObj);
      } catch (error) {
        console.error('Error processing trace:', error);
      }
    }
  };
}

/**
 * Create a span for an agent operation
 */
export function agent_span(name: string, data: AgentSpanData): SpanWrapper {
  return createSpan(name, SpanType.AGENT, data);
}

/**
 * Create a span for a generation operation
 */
export function generation_span(name: string, data: GenerationSpanData): SpanWrapper {
  return createSpan(name, SpanType.GENERATION, data);
}

/**
 * Create a span for a function call
 */
export function function_span(name: string, data: FunctionSpanData): SpanWrapper {
  return createSpan(name, SpanType.FUNCTION, data);
}

/**
 * Create a span for a handoff between agents
 */
export function handoff_span(sourceAgent: string, targetAgent: string, data: HandoffSpanData): SpanWrapper {
  return createSpan(`Handoff from ${sourceAgent} to ${targetAgent}`, SpanType.HANDOFF, data);
}

/**
 * Create a custom span
 */
export function custom_span(name: string, data: SpanData): SpanWrapper {
  return createSpan(name, SpanType.CUSTOM, data);
}

// Helper function to create spans
function createSpan(name: string, span_type: SpanType, span_data: SpanData): SpanWrapper {
  if (tracingDisabled || isTracingGloballyDisabled() || !currentTrace) {
    return new DummySpanWrapper();
  }
  
  const span: Span = {
    span_id: uuidv4(),
    trace_id: currentTrace.trace_id,
    parent_id: currentSpan?.span_id,
    name,
    span_type,
    span_data,
    started_at: new Date()
  };
  
  return new RealSpanWrapper(span);
}

/**
 * Interface for span operations
 */
interface SpanWrapper {
  enter(): void;
  exit(): void;
  addData(data: SpanData): void;
}

/**
 * Implementation for real spans
 */
class RealSpanWrapper implements SpanWrapper {
  private span: Span;
  
  constructor(span: Span) {
    this.span = span;
  }
  
  enter(): void {
    if (currentTrace) {
      currentTrace.spans.push(this.span);
      currentSpan = this.span;
    }
  }
  
  exit(): void {
    if (currentSpan?.span_id === this.span.span_id) {
      this.span.ended_at = new Date();
      
      // Pop the current span and restore parent
      if (currentTrace) {
        const parentId = this.span.parent_id;
        currentSpan = parentId
          ? currentTrace.spans.find(s => s.span_id === parentId) || null
          : null;
      }
    }
  }
  
  addData(data: SpanData): void {
    this.span.span_data = {
      ...this.span.span_data,
      ...data
    };
  }
}

/**
 * Dummy implementation for when tracing is disabled
 */
class DummySpanWrapper implements SpanWrapper {
  enter(): void {}
  exit(): void {}
  addData(_data: SpanData): void {}
} 