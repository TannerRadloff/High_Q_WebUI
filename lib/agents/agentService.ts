import { Agent, Runner, set_default_openai_key, set_tracing_export_api_key, set_tracing_disabled } from 'openai-agents';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AgentStatus } from '@/components/features/AgentStatusPanel';

// Define specialized agent types that extend the base Agent
interface AgentDefinition {
  id: string;
  name: string;
  type: string;
  instructions: string;
  model: string;
  icon: string;
  specialization?: string;
}

// Map to store initialized agent instances
let agentInstances = new Map<string, Agent>();
let runners = new Map<string, Runner>();

/**
 * Initialize the Agent SDK with API keys
 */
export function initializeAgentSDK(apiKey?: string) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  
  if (!key) {
    console.error('No OpenAI API key found for Agent SDK');
    return false;
  }
  
  // Set the default OpenAI key for the SDK
  set_default_openai_key(key);
  
  // Use the same key for tracing
  set_tracing_export_api_key(key);
  
  return true;
}

/**
 * Configure tracing settings
 */
export function configureAgentTracing(options: { disabled?: boolean; apiKey?: string }) {
  if (options.disabled) {
    set_tracing_disabled(true);
  }
  
  if (options.apiKey) {
    set_tracing_export_api_key(options.apiKey);
  }
}

/**
 * Get or create an agent from a definition
 */
export async function getAgent(definition: AgentDefinition): Promise<Agent> {
  // Check if we already have an initialized instance
  if (agentInstances.has(definition.id)) {
    return agentInstances.get(definition.id)!;
  }
  
  // Create a new agent
  const agent = new Agent({
    name: definition.name,
    instructions: definition.instructions,
    model: definition.model
  });
  
  // Store the instance for reuse
  agentInstances.set(definition.id, agent);
  
  return agent;
}

/**
 * Get all initialized agent instances
 */
export function getAgentInstances(): Map<string, Agent> {
  return agentInstances;
}

/**
 * Reset all agent instances (useful for testing)
 */
export function resetAgentInstances() {
  agentInstances.clear();
  runners.clear();
}

/**
 * Create a specialized agent from a type
 */
export async function createSpecializedAgent(
  type: string,
  name: string,
  instructions?: string
): Promise<Agent> {
  // Create appropriate instructions based on type
  let agentInstructions = instructions;
  
  if (!agentInstructions) {
    switch (type.toLowerCase()) {
      case 'research':
        agentInstructions = 'You are a specialized research agent that excels at finding information and answering questions.';
        break;
      case 'coding':
        agentInstructions = 'You are a specialized coding agent that helps with programming tasks, debugging, and software development.';
        break;
      case 'writing':
        agentInstructions = 'You are a specialized writing agent that helps create high-quality content, improve writing, and provide editorial assistance.';
        break;
      case 'data':
        agentInstructions = 'You are a specialized data analysis agent that helps interpret data, generate insights, and create visualizations.';
        break;
      default:
        agentInstructions = 'You are a helpful AI assistant that provides accurate and useful information.';
    }
  }
  
  // Create the agent
  const id = `${type.toLowerCase()}_${uuidv4()}`;
  
  const agent = new Agent({
    name: name,
    instructions: agentInstructions,
    model: 'gpt-4o'
  });
  
  // Store the instance
  agentInstances.set(id, agent);
  
  return agent;
}

/**
 * Process a user message through agents and get a response
 */
export async function processWithAgents(
  message: string,
  chatId: string,
  onUpdate?: (status: AgentStatus) => void
) {
  try {
    // Create or get delegation agent
    const delegationAgent = await getDelegationAgent();
    
    // Update status if callback provided
    if (onUpdate) {
      onUpdate({
        id: 'delegation-agent',
        name: 'Delegation Agent',
        type: 'delegation',
        task: message,
        status: 'working',
        progress: 10,
        startTime: new Date(),
        endTime: undefined,
        result: undefined
      });
    }
    
    // Get or create a runner for this agent
    let runner = runners.get(delegationAgent.name);
    
    if (!runner) {
      runner = new Runner(delegationAgent);
      runners.set(delegationAgent.name, runner);
    }
    
    // Update progress
    if (onUpdate) {
      onUpdate({
        id: 'delegation-agent',
        name: 'Delegation Agent',
        type: 'delegation',
        task: message,
        status: 'working',
        progress: 30,
        startTime: new Date(),
        endTime: undefined,
        result: undefined
      });
    }
    
    // Run the agent
    const result = await runner.run(message, {
      workflow_name: `Chat ${chatId}`,
      trace_metadata: {
        chat_id: chatId
      }
    });
    
    // Update completion status
    if (onUpdate) {
      onUpdate({
        id: 'delegation-agent',
        name: 'Delegation Agent',
        type: 'delegation',
        task: message,
        status: 'completed',
        progress: 100,
        startTime: new Date(),
        endTime: new Date(),
        result: result.output
      });
    }
    
    // Extract agent from the result's metadata
    let agentInfo = {
      id: 'delegation-agent',
      name: 'Delegation Agent',
      type: 'delegation',
      icon: '👨‍💼'
    };
    
    if (result.metadata?.last_agent_name) {
      agentInfo = {
        id: result.metadata.last_agent_id || 'specialized-agent',
        name: result.metadata.last_agent_name,
        type: result.metadata.last_agent_type || 'specialized',
        icon: result.metadata.last_agent_icon || '🤖'
      };
    }
    
    return {
      response: result.output,
      agent: agentInfo,
      handoffId: result.metadata?.trace_id
    };
  } catch (error) {
    console.error('Error processing with agents:', error);
    throw error;
  }
}

/**
 * Create and run a streaming agent process
 */
export async function streamWithAgents(
  message: string,
  chatId: string,
  callbacks: {
    onStart?: () => void;
    onToken?: (token: string) => void;
    onAgentChange?: (agent: any) => void;
    onComplete?: (result: any) => void;
    onError?: (error: any) => void;
  }
) {
  try {
    // Create or get delegation agent
    const delegationAgent = await getDelegationAgent();
    
    // Get or create a runner
    let runner = runners.get(delegationAgent.name);
    
    if (!runner) {
      runner = new Runner(delegationAgent);
      runners.set(delegationAgent.name, runner);
    }
    
    // Call onStart if provided
    if (callbacks.onStart) {
      callbacks.onStart();
    }
    
    // Define stream callback handlers
    const streamCallbacks = {
      onStart: callbacks.onStart,
      
      onToken: callbacks.onToken,
      
      onHandoff: (from: string, to: string) => {
        if (callbacks.onAgentChange) {
          callbacks.onAgentChange({
            from,
            to
          });
        }
        if (callbacks.onToken) {
          callbacks.onToken(`\n\n_Handing off from ${from} to ${to}..._\n\n`);
        }
      },
      
      onError: callbacks.onError,
      
      onComplete: (result: any) => {
        if (callbacks.onComplete) {
          callbacks.onComplete(result);
        }
      }
    };
    
    // Run the agent with streaming
    await runner.run_streamed(
      message,
      streamCallbacks,
      {
        workflow_name: `Chat ${chatId} (streaming)`,
        trace_metadata: {
          chat_id: chatId
        }
      }
    );
  } catch (error) {
    console.error('Error streaming with agents:', error);
    if (callbacks.onError) {
      callbacks.onError(error);
    }
  }
}

/**
 * Get or create the delegation agent
 */
async function getDelegationAgent(): Promise<Agent> {
  const delegationId = 'delegation-agent';
  
  if (agentInstances.has(delegationId)) {
    return agentInstances.get(delegationId)!;
  }
  
  // Create the delegation agent
  const agent = new Agent({
    name: 'Delegation Agent',
    instructions: `You are the primary delegation agent responsible for receiving user queries and directing them to appropriate specialist agents. 
    Understand what the user is asking for, then analyze the task and respond directly with the most helpful information.
    For complex tasks, you may hand off to specialized agents if necessary.`,
    model: 'gpt-4o'
  });
  
  // Add specialized agent handoffs
  const researchAgent = await createSpecializedAgent('research', 'Research Agent');
  const codingAgent = await createSpecializedAgent('coding', 'Coding Agent');
  const writingAgent = await createSpecializedAgent('writing', 'Writing Agent');
  
  // Define the handoffs
  agent.handoffs = [researchAgent, codingAgent, writingAgent];
  
  // Store the delegation agent
  agentInstances.set(delegationId, agent);
  
  return agent;
} 