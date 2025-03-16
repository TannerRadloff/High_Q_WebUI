# Agent Tracing System

This document describes the agent tracing system implemented in the AI chatbot application. The system provides real-time visibility into agent operations, aligned with OpenAI's Responses API and Agents SDK documentation.

## Overview

The agent tracing system captures detailed information about agent operations, including:

- Agent generations
- Function calls
- Handoffs between agents
- Guardrails
- Custom events

The system is designed to be:
- Real-time: Updates are streamed to the UI as they happen
- Persistent: Traces are stored in Supabase for later analysis
- Hierarchical: Spans are organized in a parent-child relationship
- Aligned with OpenAI: Compatible with OpenAI's tracing structure

## Architecture

The tracing system consists of the following components:

1. **Trace Data Model**: Defines the structure of traces and spans
2. **Supabase Database**: Stores traces and spans persistently
3. **Trace Processor**: Handles the processing and storage of traces
4. **Agent Trace Service**: Manages traces and provides real-time updates
5. **Agent Trace Viewer**: UI component for visualizing traces

## Database Schema

The system uses two main tables in Supabase:

### agent_trace

Stores the top-level trace information:

- `id`: UUID primary key
- `workflow_name`: Name of the workflow
- `trace_id`: Unique identifier for the trace
- `group_id`: Optional group identifier
- `session_id`: Optional session identifier
- `user_id`: Reference to the user who created the trace
- `chat_id`: Reference to the chat where the trace was created
- `status`: Current status (running, completed, error)
- `started_at`: When the trace started
- `ended_at`: When the trace ended (if completed)
- `metadata`: Additional metadata about the trace
- `created_at`: When the record was created

### agent_trace_span

Stores individual spans within a trace:

- `id`: UUID primary key
- `span_id`: Unique identifier for the span
- `trace_id`: Reference to the parent trace
- `parent_id`: Reference to the parent span (if any)
- `name`: Name of the span
- `span_type`: Type of span (agent, generation, function, guardrail, handoff, custom)
- `span_data`: Data associated with the span
- `started_at`: When the span started
- `ended_at`: When the span ended (if completed)
- `created_at`: When the record was created

## Setup

To set up the agent tracing system:

1. Ensure Supabase is properly configured
2. Run the setup script to create the necessary tables:

```bash
npm run setup:agent-traces
```

## Usage

### Creating Traces

Traces are automatically created when:
- A user sends a message to an agent
- An agent is run
- A workflow is executed

You can also manually create traces:

```typescript
import { trace } from '@/agents/tracing';

// Create and start a trace
const traceObj = trace('My Workflow', {
  trace_id: 'my-trace-id', // Optional, will be generated if not provided
  workflow_name: 'My Workflow',
  trace_metadata: {
    // Any additional metadata
  }
});

// Start the trace
const activeTrace = traceObj.start();

// ... perform operations ...

// Finish the trace
await traceObj.finish();
```

### Creating Spans

Spans represent individual operations within a trace:

```typescript
import { agent_span, generation_span, function_span } from '@/agents/tracing';

// Create an agent span
const agentSpan = agent_span('Agent Operation', {
  agent_name: 'My Agent',
  input: 'User query',
});

// Enter the span (start timing)
agentSpan.enter();

// ... perform agent operation ...

// Exit the span (stop timing)
agentSpan.exit();
```

### Viewing Traces

Traces are automatically displayed in the UI during agent operations. The trace viewer shows:

- Trace metadata (ID, start time, duration)
- Hierarchical view of spans
- Real-time updates as spans are created and completed
- Detailed information about each span

## Integration with OpenAI

The tracing system is designed to be compatible with OpenAI's tracing structure, making it easy to:

1. Understand agent behavior in a format familiar to OpenAI developers
2. Potentially export traces to OpenAI's tracing system
3. Follow best practices for agent tracing

## Extending the System

The tracing system can be extended in several ways:

1. **Custom Span Types**: Add new span types for specific operations
2. **Additional Metadata**: Capture more information in traces and spans
3. **Alternative Storage**: Implement different trace processors for other storage systems
4. **Analytics**: Build analytics on top of the trace data

## Troubleshooting

If you encounter issues with the tracing system:

1. Check that Supabase is properly configured
2. Ensure the agent trace tables exist in the database
3. Look for errors in the browser console
4. Verify that the trace processor is properly initialized

## References

- [OpenAI Responses API Documentation](https://sdk.vercel.ai/docs/guides/openai-responses)
- [OpenAI Agents SDK Tracing Documentation](https://openai.github.io/openai-agents-python/tracing/) 