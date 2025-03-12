# Agent Tracing System

The agents in this application now include built-in tracing functionality to help debug, visualize, and monitor workflows during development and in production.

## Overview

Tracing collects a comprehensive record of events during an agent run:
- LLM generations
- Tool calls
- Handoffs between agents
- Custom events

## Using Tracing

### Default Behavior

Tracing is enabled by default and will log basic information to the console.

### Disabling Tracing

You can disable tracing in two ways:

1. **Globally**: Set the environment variable `OPENAI_AGENTS_DISABLE_TRACING=1`
2. **Per run**: Set `tracing_disabled: true` in the run configuration

```typescript
// Disable tracing for a specific run
const result = await orchestrator.handleQuery(query, {
  tracing_disabled: true
});
```

### Configuring Traces

When making an API call to the agent-query endpoint, you can include tracing configuration in the request body:

```javascript
fetch('/api/agent-query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: "What's the latest research on renewable energy?",
    workflow_name: "Energy Research",
    group_id: "session_123",
    tracing_disabled: false,
    trace_include_sensitive_data: true,
    metadata: {
      user_id: "user_123",
      session_id: "session_abc"
    }
  }),
});
```

### Trace Properties

- **workflow_name**: Logical name for the workflow (e.g., "Research Query")
- **trace_id**: Unique ID, automatically generated if not provided
- **group_id**: Optional group ID to link multiple traces (e.g., chat thread ID)
- **disabled**: If true, tracing is disabled
- **metadata**: Optional key-value pairs for the trace

### Spans

Spans represent operations with start and end times:

- **Agent spans**: Track agent execution
- **Generation spans**: Track LLM generations
- **Function spans**: Track tool/function calls
- **Custom spans**: Track any custom operation

Each span includes:
- Start and end timestamps
- Relationship to other spans
- Operation-specific data

### Custom Trace Processors

You can implement custom trace processors to send trace data to external systems:

```typescript
import { addTraceProcessor, TraceProcessor, Trace } from './agents/tracing';

// Example processor that sends traces to an external API
class APITraceProcessor implements TraceProcessor {
  async processTrace(trace: Trace): Promise<void> {
    if (trace.disabled) return;
    
    // Send trace to external system
    await fetch('https://your-observability-platform.com/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trace),
    });
  }
}

// Add the processor
addTraceProcessor(new APITraceProcessor());
```

### Example: High-Level Trace

You can wrap multiple agent runs in a single trace:

```typescript
import { trace } from './agents/tracing';

async function processUserQuery(userQuery) {
  // Create a trace for the entire workflow
  const workflowTrace = trace("User Query Processing", {
    group_id: "session_123",
    metadata: { user_id: "user_456" }
  });
  
  // Start the trace
  workflowTrace.start();
  
  try {
    // First agent call
    const triageResult = await triageAgent.handleTask(userQuery);
    
    // Second agent call
    const researchResult = await researchAgent.handleTask(userQuery);
    
    // Third agent call
    const reportResult = await reportAgent.handleTask(
      `User asked: "${userQuery}". Research results: ${researchResult.content}`
    );
    
    return reportResult;
  } finally {
    // Always finish the trace
    await workflowTrace.finish();
  }
}
```

## Viewing Traces

Currently, traces are logged to the console. You can implement custom trace processors to send traces to your preferred observability tools or create a custom dashboard to visualize them.

## Sensitive Data

Some spans might include sensitive data such as the inputs or outputs of LLM generations or function calls. You can control whether this data is included in traces:

```typescript
// Exclude sensitive data from traces
await orchestrator.handleQuery(query, {
  trace_include_sensitive_data: false
});
``` 