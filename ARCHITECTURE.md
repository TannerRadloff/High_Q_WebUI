# Agent Architecture Overview

This document outlines the architecture of our agent system, which is built using the OpenAI Agents SDK to implement agent orchestration, tracing, and collaboration.

## Components

### 1. Agent Service (`lib/agents/agentService.ts`)

The Agent Service is the core of our implementation. It's responsible for:

- Initializing and configuring the OpenAI Agents SDK
- Managing agent instances and runners
- Creating specialized agents based on task requirements
- Processing user messages through agents
- Supporting streaming responses
- Tracking agent status and progress

Key functions:
- `initializeAgentSDK()`: Configures the SDK with API keys
- `processWithAgents()`: Processes a user message through appropriate agents
- `streamWithAgents()`: Provides streaming support for agent responses

### 2. API Integration (`app/api/agent-handoff/route.ts`)

This API endpoint provides an HTTP interface to our agent system:

- Receives user messages and context from the client
- Uses the Agent Service to process messages
- Stores handoff records for tracking and analytics
- Returns agent responses and metadata

### 3. Chat Component Integration (`src/components/features/chat.tsx`)

The Chat component integrates our agent system into the UI:

- Uses the agent handoff API to process messages
- Manages agent status display and updates
- Handles streaming responses
- Provides visual feedback on agent activities

### 4. Agent Status Panel (`components/features/AgentStatusPanel.tsx`)

This component visualizes the status of active agents:

- Shows which agents are working on tasks
- Displays progress, status, and response time
- Provides detailed information about agent activities
- Supports expanding/collapsing for more details

## Agent Workflow

1. **Initialization**:
   - The Agent SDK is initialized with API keys
   - A delegation agent is created as the entry point
   - Specialized agents are registered for different task types

2. **Message Processing**:
   - User messages are sent to the delegation agent
   - The delegation agent analyzes the task and may handle it directly
   - For complex tasks, the delegation agent hands off to specialized agents
   - The runner manages the flow between agents

3. **Tracing**:
   - Each agent run creates a trace
   - Spans are created for agent operations and function calls
   - Tracing data can be exported for analysis and debugging

4. **Status Updates**:
   - Agent status is tracked and updated throughout processing
   - UI is updated to reflect current agent activities
   - On completion, results are displayed in the chat

## OpenAI Agents SDK Integration

Our implementation fully aligns with the OpenAI Agents SDK by:

1. Using the SDK's `Agent` and `Runner` classes directly
2. Implementing proper tracing and span management
3. Following the SDK's handoff patterns for agent delegation
4. Using the SDK's event system for streaming responses
5. Configuring the SDK using the official configuration methods

## Setup Requirements

To use this architecture:

1. Install the OpenAI Agents SDK: `npm install openai-agents`
2. Set up environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
3. Initialize the SDK before first use:
   ```javascript
   import { initializeAgentSDK } from '@/lib/agents/agentService';
   
   initializeAgentSDK();
   ``` 