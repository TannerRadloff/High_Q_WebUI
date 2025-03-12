# Agent System Architecture

This system implements a multi-agent architecture that allows for delegation and specialization. The architecture is inspired by the OpenAI Agents SDK patterns but implemented in TypeScript.

## Core Architecture

The system uses a delegation-based approach:

1. **DelegationAgent**: The main entry point that users interact with first. It analyzes user requests and delegates to specialized agents.

2. **Specialized Agents**:
   - **TriageAgent**: Analyzes and categorizes tasks
   - **ResearchAgent**: Performs research and gathers information
   - **ReportAgent**: Formats information into structured reports

## Agent Delegation Flow

1. A user submits a query to the `Orchestrator`
2. The `Orchestrator` passes the query to the `DelegationAgent`
3. The `DelegationAgent` analyzes the query and delegates to the appropriate specialized agent using handoffs
4. The specialized agent processes the request and returns a result
5. The result is returned to the user through the `Orchestrator`

## Using the Agent System

```typescript
// Create an orchestrator instance
const orchestrator = new Orchestrator();

// Process a user query
const result = await orchestrator.handleQuery("What are the latest advancements in renewable energy?");

// Access the result
console.log(result.report); // The final content returned by the agent chain
console.log(result.metadata.handoffPath); // The path of handoffs between agents
```

## Streaming Responses

The system supports streaming responses for real-time updates:

```typescript
await orchestrator.streamQuery(
  "What are the environmental impacts of electric vehicles?",
  {
    onStart: () => console.log("Processing started"),
    onToken: (token) => console.log("New token:", token),
    onHandoff: (from, to) => console.log(`Handoff from ${from} to ${to}`),
    onComplete: (response) => console.log("Final response:", response),
    onError: (error) => console.error("Error:", error)
  }
);
```

## Agent Tracing System

The agents include built-in tracing functionality to help debug, visualize, and monitor workflows during development and in production.

### Overview

Tracing collects a comprehensive record of events during an agent run:
- LLM generations
- Tool calls
- Handoffs between agents
- Custom events

### Using Tracing

#### Default Behavior

Tracing is enabled by default and will log basic information to the console.

#### Disabling Tracing

You can disable tracing in two ways:

1. **Globally**: Set the environment variable `OPENAI_AGENTS_DISABLE_TRACING=1`
2. **Per run**: Set `tracing_disabled: true` in the run configuration

```typescript
// Disable tracing for a specific run
const result = await orchestrator.handleQuery(query, {
  tracing_disabled: true
});
```

#### Configuring Traces

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

### Sensitive Data

Some spans might include sensitive data such as the inputs or outputs of LLM generations or function calls. You can control whether this data is included in traces:

```typescript
// Exclude sensitive data from traces
await orchestrator.handleQuery(query, {
  trace_include_sensitive_data: false
});
```

## Extending the System

### Adding a New Specialized Agent

To add a new specialized agent:

1. Create a new agent class that extends `BaseAgent`
2. Add it to the `DelegationAgent`'s handoffs array
3. Update the `DelegationAgent`'s instructions to include information about the new agent

Example:

```typescript
// 1. Create a new specialized agent
export class SummaryAgent extends BaseAgent {
  constructor() {
    super({
      name: 'SummaryAgent',
      instructions: `You are a summarization specialist that creates concise summaries.`,
      model: 'gpt-4o',
      // Additional configuration...
    });
  }
  
  // Implement any specialized methods...
}

// 2 & 3. Update the DelegationAgent to include the new agent
constructor() {
  // Create agents including the new one
  const summaryAgent = new SummaryAgent();
  
  super({
    // ...
    handoffs: [triageAgent, researchAgent, reportAgent, summaryAgent],
    instructions: `You are an intelligent assistant that helps users by delegating tasks to specialized agents.
    
    Available specialized agents:
    - TriageAgent: For analyzing and categorizing tasks
    - ResearchAgent: For finding current information
    - ReportAgent: For formatting information
    - SummaryAgent: For creating concise summaries
    
    // ...
    `
  });
}
``` 