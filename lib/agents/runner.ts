import { BaseAgent, AgentResponse } from './agent-base';
import { MimirAgent } from './mimir-agent';

/**
 * Run an agent with a prompt
 * @param agent The agent to run
 * @param prompt The user's prompt
 * @param context Optional context for the agent
 * @returns The result of running the agent
 */
export async function runAgent(
  agent: BaseAgent,
  prompt: string,
  context?: any
): Promise<AgentResponse> {
  try {
    // If this is the Mimir agent, it will handle delegation
    if (agent instanceof MimirAgent) {
      return await agent.run(prompt, context);
    }
    
    // For other agents, check if they can handle the query
    const canHandle = await agent.canHandle(prompt);
    
    if (canHandle) {
      // Run the agent directly
      return await agent.run(prompt, context);
    } else {
      // If the agent can't handle it, return a message indicating that
      return {
        content: `I'm sorry, as a ${agent.name}, I don't have the expertise to handle this query. Please try asking a different agent or rephrase your question.`,
        agent: agent.name,
        model: agent.model
      };
    }
  } catch (error) {
    console.error('Error running agent:', error);
    return {
      content: 'There was an error processing your request. Please try again later.',
      agent: agent.name,
      model: agent.model || 'unknown'
    };
  }
} 