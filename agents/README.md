# Agent Architecture

This module implements a flexible and extensible architecture for building AI-powered agents. It follows best practices inspired by the OpenAI Assistants API and Agent SDK, while providing a more customizable foundation.

## Core Concepts

### Agents

Agents are the main building blocks of the system. Each agent has:

- A name and instructions
- A model and model settings
- Optional tools they can use
- Optional agents they can hand off to
- Optional memory for context persistence

The base implementation is in `BaseAgent.ts`, which other specialized agents can extend.

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
const orchestrator = factory.createAgent(AgentType.CUSTOM, {
  name: 'Orchestrator',
  instructions: 'You coordinate between specialized agents to solve tasks.',
  tools: [
    triageAgent.asTool('triage', 'Analyze and categorize the user query'),
    researchAgent.asTool('research', 'Search for information')
  ]
});

// Process a user query through the orchestrator
const response = await orchestrator.handleTask(
  "I need to learn about quantum computing for a presentation"
);
```

### Using Memory

```typescript
import { AgentFactory, AgentType } from './agents/AgentFactory';
import { InMemoryStorage, MemoryManager } from './agents/memory';

const factory = new AgentFactory();
const storage = new InMemoryStorage();

const agent = factory.createAgent(AgentType.CUSTOM, {
  name: 'AssistantWithMemory',
  instructions: context => {
    // Use context.conversationHistory and context.relevantMemories
    return `You are an assistant that remembers past interactions.`;
  }
});

// Replace the default memory with our custom storage
(agent as any).memory = new MemoryManager(storage, agent.name);

// The agent will now store interactions and retrieve relevant context
```

## Best Practices

1. **Use the Factory**: Always create agents through the `AgentFactory` for consistent configuration and caching.

2. **Specialized Agents**: Create specialized agents for specific tasks rather than one-size-fits-all agents.

3. **Composition**: Use the agent-as-tool pattern to compose capabilities rather than building monolithic agents.

4. **Dynamic Instructions**: Use functions for agent instructions that can adapt based on context.

5. **Memory Management**: Use the memory system to maintain context across interactions.

6. **Tracing**: Use the tracing system for debugging and monitoring agent behavior.

7. **Error Handling**: Implement proper error handling at both the agent and orchestration levels.

## Extending the System

To create a new specialized agent type:

1. Create a new class that extends `BaseAgent`
2. Override the `handleTask` method with specialized logic
3. Add the agent type to the `AgentType` enum in `AgentFactory.ts`
4. Add a case in the factory's `createAgent` method to instantiate your agent

Example:

```typescript
export class MySpecializedAgent extends BaseAgent {
  async handleTask(userQuery: string, context?: AgentContext): Promise<AgentResponse> {
    // Specialized pre-processing
    
    // Call the base implementation
    const response = await super.handleTask(userQuery, context);
    
    // Specialized post-processing
    
    return response;
  }
}
``` 