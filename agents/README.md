# Agent Architecture

This module implements a flexible and extensible architecture for building AI-powered agents. It follows best practices from the OpenAI Agents SDK, providing a compatible implementation that can be used in a similar way.

## Core Concepts

### Agents

Agents are the main building blocks of the system. Each agent has:

- A name and instructions
- A model and model settings
- Optional tools they can use
- Optional agents they can hand off to
- Optional memory for context persistence

The base implementation is in `BaseAgent.ts`, which other specialized agents can extend.

### Tools

Our implementation supports all three classes of tools from the OpenAI Agents SDK:

1. **Hosted tools**: We provide equivalents to OpenAI's hosted tools:
   - `webSearchTool`: Similar to OpenAI's `WebSearchTool`
   - `fileSearchTool`: Similar to OpenAI's `FileSearchTool`
   - `computerTool`: Similar to OpenAI's `ComputerTool`

2. **Function calling**: The `functionTool` creator allows you to create custom tools from functions.

3. **Agents as tools**: The `agentAsTool` function and `asTool` method on agents allow using agents as tools.

### Runner

The `AgentRunner` class provides a way to run agents, with a static `run` method that matches OpenAI's pattern:

```typescript
// Create an agent with tools
const agent = new BaseAgent({
  name: "Assistant",
  instructions: "You are a helpful assistant.",
  tools: [webSearchTool, fileSearchTool]
});

// Run the agent
const result = await AgentRunner.run(
  agent, 
  "Which coffee shop should I go to, taking into account my preferences and the weather today in SF?"
);

// Access the final output
console.log(result.final_output);
```

### Factory Pattern

The `AgentFactory` class provides a consistent way to create agents with:

- Default configuration
- Instance caching
- Ready-made agent types
- Easy creation of composite workflows

### Agent-as-Tool Pattern

Agents can be converted to tools using the `asTool` method, allowing them to be used by other agents. This enables powerful composition patterns where specialized agents can be combined to solve complex tasks.

### Memory System

The memory system provides:

- Short-term and long-term memory
- Conversation history tracking
- Contextual retrieval for relevant information
- Automatic enhancement of agent context

## Key Components

- `agent.ts`: Core interfaces for agents and their configurations
- `BaseAgent.ts`: Base implementation of the Agent interface
- `AgentFactory.ts`: Factory for creating agent instances
- `tools.ts`: Tool interfaces and factory functions
- `memory.ts`: Memory system for persistent context
- `tracing.ts`: Tracing infrastructure for debugging and monitoring

## Usage Examples

### Creating a Basic Agent

```typescript
import { AgentFactory, AgentType } from './agents/AgentFactory';

const factory = new AgentFactory();

const agent = factory.createAgent(AgentType.CUSTOM, {
  name: 'MyAgent',
  instructions: 'You are a helpful assistant.',
  model: 'gpt-4o',
  modelSettings: {
    temperature: 0.7
  }
});

const response = await agent.handleTask("What is the capital of France?");
console.log(response.content);
```

### Using Tools

```typescript
import { AgentFactory, AgentType } from './agents/AgentFactory';
import { webSearchTool } from './agents/tools';

const factory = new AgentFactory();

const agent = factory.createAgent(AgentType.CUSTOM, {
  name: 'ResearchAgent',
  instructions: 'You are a research assistant that helps find information.',
  tools: [webSearchTool]
});

const response = await agent.handleTask(
  "What are the latest developments in AI research?"
);
console.log(response.content);
```

### Agent Composition

```typescript
import { AgentFactory, AgentType } from './agents/AgentFactory';

const factory = new AgentFactory();

// Create specialized agents
const triageAgent = factory.createAgent(AgentType.TRIAGE);
const researchAgent = factory.createAgent(AgentType.RESEARCH);

// Create an orchestration agent that uses the others as tools
const runner = factory.createAgent(AgentType.CUSTOM, {
  name: 'Runner',
  instructions: 'You coordinate between specialized agents to complete tasks',
  tools: [
    triageAgent.asTool('triage', 'Analyze and categorize the user query'),
    researchAgent.asTool('research', 'Search for information')
  ]
});

// Process a user query through the runner
const response = await runner.handleTask(
  "I need to learn about quantum computing for a presentation"
);
```

### Using Memory

```

## Agent Self-Improvement

This implementation now includes comprehensive agent evaluation and self-improvement mechanisms that align with OpenAI's Agents SDK guidance. These features allow agents to:

1. Have their responses evaluated by a specialized "judge" agent
2. Receive structured feedback on their performance
3. Improve their responses based on this feedback
4. Continue the improvement loop until quality standards are met

### Using the JudgeAgent

The `JudgeAgent` is a specialized agent that evaluates the quality of responses from other agents:

```typescript
import { JudgeAgent } from './agents/JudgeAgent';

// Create a judge with custom evaluation criteria
const judge = new JudgeAgent({
  evaluationCriteria: [
    'Accuracy and factual correctness',
    'Completeness of response',
    'Logical coherence',
    // Add more criteria as needed
  ]
});

// Evaluate a response
const evaluation = await judge.evaluateResponse(
  "What are the pros and cons of microservices?", // Original query
  "Microservices have several advantages..." // Response to evaluate
);

// Structured evaluation result
console.log(`Score: ${evaluation.score}/10`);
console.log(`Acceptable: ${evaluation.is_acceptable}`);
console.log(`Strengths: ${evaluation.strengths}`);
console.log(`Weaknesses: ${evaluation.weaknesses}`);
console.log(`Suggestions: ${evaluation.suggestions}`);
```

### Self-Improvement Loop

The self-improvement loop uses a `JudgeAgent` to iteratively improve an agent's responses:

```typescript
import { improveWithFeedback } from './agents/improvement';

// Create your primary agent
const researchAgent = new ResearchAgent();

// Create a judge agent
const judge = new JudgeAgent();

// Use the improvement loop
const result = await improveWithFeedback(
  researchAgent,
  judge,
  "What are the latest developments in AI?",
  undefined, // Initial response is optional
  context, // Optional context
  {
    maxIterations: 3,
    minAcceptableScore: 8,
    verbose: true
  }
);

// Access the final improved response
console.log(result.finalResponse);

// Access improvement metadata
console.log(`Iterations: ${result.iterations}`);
console.log(`Final score: ${result.finalEvaluation.score}`);
console.log(`Success: ${result.success}`);
```

### Factory Support

The `AgentFactory` now supports creating self-improving workflows:

```typescript
import { AgentFactory, AgentType } from './agents/AgentFactory';

const factory = new AgentFactory();

// Create a self-improving workflow
const workflow = factory.createSelfImprovingWorkflow({
  primaryAgentType: AgentType.RESEARCH,
  primaryAgentConfig: {
    // Configuration for the primary agent
  },
  judgeAgentConfig: {
    // Optional judge configuration
    evaluationCriteria: ['Accuracy', 'Completeness', 'Clarity']
  },
  improvementConfig: {
    // Optional improvement loop configuration
    maxIterations: 2,
    minAcceptableScore: 8
  }
});

// Use the workflow
const result = await workflow.handleTask("What is quantum computing?");
```

See the examples directory for more detailed usage examples.