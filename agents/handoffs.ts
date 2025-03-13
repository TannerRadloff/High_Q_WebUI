// agents/handoffs.ts
// Re-export from handoff.ts for backwards compatibility
export * from './handoff';

// Add any additional handoffs-specific functionality here

import { z } from 'zod';
import { Agent, AgentContext, HandoffInputFilter } from './agent';

/**
 * Interface for Handoff object that follows OpenAI Agents SDK patterns
 */
export interface Handoff {
  agent: Agent;
  toolNameOverride?: string;
  toolDescriptionOverride?: string;
  onHandoff?: (ctx: AgentContext, inputData?: any) => void | Promise<void>;
  inputType?: z.ZodType<any>;
  inputFilter?: HandoffInputFilter;
}

/**
 * Creates a handoff to another agent
 */
export function createHandoff(
  agent: Agent,
  options?: {
    toolNameOverride?: string;
    toolDescriptionOverride?: string;
    onHandoff?: (ctx: AgentContext, inputData?: any) => void | Promise<void>;
    inputType?: z.ZodType<any>;
    inputFilter?: HandoffInputFilter;
  }
): Handoff {
  return {
    agent,
    toolNameOverride: options?.toolNameOverride,
    toolDescriptionOverride: options?.toolDescriptionOverride,
    onHandoff: options?.onHandoff,
    inputType: options?.inputType,
    inputFilter: options?.inputFilter
  };
}

/**
 * Alias for createHandoff for backward compatibility
 */
export const handoff = createHandoff;

/**
 * Default function to generate the tool name for a handoff
 * @param agentName Name of the agent
 * @returns The default tool name in format 'transfer_to_<agent_name>'
 */
export function defaultToolName(agentName: string): string {
  return `transfer_to_${agentName.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Default function to generate the tool description for a handoff
 * @param agentName Name of the agent
 * @returns The default tool description
 */
export function defaultToolDescription(agentName: string): string {
  return `Transfer the conversation to the ${agentName} agent`;
}

/**
 * Common handoff filters, similar to agents.extensions.handoff_filters in the SDK
 */
export const handoffFilters = {
  /**
   * Remove all tool calls from the history
   */
  removeAllTools: (input: any) => {
    if (input && input.messages) {
      return {
        ...input,
        messages: input.messages.filter((message: any) => !message.tool_calls)
      };
    }
    return input;
  },
  
  /**
   * Keep only the most recent user message
   */
  keepOnlyLastUserMessage: (input: any) => {
    if (input && input.messages) {
      const lastUserMessage = [...input.messages]
        .reverse()
        .find((message: any) => message.role === 'user');
      
      return {
        ...input,
        messages: lastUserMessage ? [lastUserMessage] : []
      };
    }
    return input;
  }
};

/**
 * Recommended prompts for handoffs
 */
export const handoffPrompt = {
  RECOMMENDED_PROMPT_PREFIX: `You are part of a system where tasks can be handed off between specialized agents.
If you receive a handoff, it means another agent determined you're the best fit for this task.
Focus on your specialty, and don't hand the task back to the agent that handed it to you unless absolutely necessary.
`,

  /**
   * Add handoff instructions to a prompt
   */
  promptWithHandoffInstructions: (originalPrompt: string): string => {
    return `${handoffPrompt.RECOMMENDED_PROMPT_PREFIX}
${originalPrompt}`;
  }
}; 