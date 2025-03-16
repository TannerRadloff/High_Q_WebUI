import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Trace, Span, TraceProcessor, SpanType } from '@/agents/tracing';
import { Database } from '@/types/supabase';

/**
 * Supabase trace processor for persisting traces to Supabase
 */
export class SupabaseTraceProcessor implements TraceProcessor {
  private supabase;
  private batchSize: number;
  private batchInterval: number;
  private traceQueue: Trace[] = [];
  private spanQueue: Span[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    supabaseUrl?: string,
    supabaseKey?: string,
    options?: {
      batchSize?: number;
      batchInterval?: number;
    }
  ) {
    // Use environment variables if not provided
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and key are required for SupabaseTraceProcessor');
    }

    this.supabase = createClient<Database>(url, key);
    this.batchSize = options?.batchSize || 10;
    this.batchInterval = options?.batchInterval || 5000; // 5 seconds default

    // Start the batch processing timer
    this.startBatchTimer();
  }

  /**
   * Process a trace by adding it to the queue for batch processing
   */
  async processTrace(trace: Trace): Promise<void> {
    if (trace.disabled) return;

    // Add the trace to the queue
    this.traceQueue.push(trace);

    // Add all spans to the span queue
    this.spanQueue.push(...trace.spans);

    // Process immediately if we've reached the batch size
    if (this.traceQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  /**
   * Start the batch timer to periodically process queued traces
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(async () => {
      if (this.traceQueue.length > 0 || this.spanQueue.length > 0) {
        await this.processBatch();
      }
    }, this.batchInterval);
  }

  /**
   * Process a batch of traces and spans
   */
  private async processBatch(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      // Process traces
      const traces = [...this.traceQueue];
      this.traceQueue = [];

      // Process spans
      const spans = [...this.spanQueue];
      this.spanQueue = [];

      if (traces.length > 0) {
        await this.persistTraces(traces);
      }

      if (spans.length > 0) {
        await this.persistSpans(spans);
      }
    } catch (error) {
      console.error('Error processing trace batch:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Persist traces to Supabase
   */
  private async persistTraces(traces: Trace[]): Promise<void> {
    const traceRecords = traces.map(trace => ({
      id: uuidv4(),
      workflow_name: trace.workflow_name,
      trace_id: trace.trace_id,
      group_id: trace.group_id,
      status: trace.ended_at ? 'completed' : 'running',
      started_at: trace.started_at.toISOString(),
      ended_at: trace.ended_at ? trace.ended_at.toISOString() : null,
      metadata: trace.metadata || null
    }));

    const { error } = await this.supabase
      .from('agent_trace')
      .upsert(traceRecords, { onConflict: 'trace_id' });

    if (error) {
      console.error('Error persisting traces to Supabase:', error);
    }
  }

  /**
   * Persist spans to Supabase
   */
  private async persistSpans(spans: Span[]): Promise<void> {
    const spanRecords = spans.map(span => ({
      id: uuidv4(),
      span_id: span.span_id,
      trace_id: span.trace_id,
      parent_id: span.parent_id,
      name: span.name,
      span_type: span.span_type,
      span_data: span.span_data,
      started_at: span.started_at.toISOString(),
      ended_at: span.ended_at ? span.ended_at.toISOString() : null
    }));

    const { error } = await this.supabase
      .from('agent_trace_span')
      .upsert(spanRecords, { onConflict: 'span_id' });

    if (error) {
      console.error('Error persisting spans to Supabase:', error);
    }
  }

  /**
   * Clean up resources when the processor is no longer needed
   */
  dispose(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Process any remaining items in the queue
    if (this.traceQueue.length > 0 || this.spanQueue.length > 0) {
      this.processBatch().catch(error => {
        console.error('Error processing final batch:', error);
      });
    }
  }
} 