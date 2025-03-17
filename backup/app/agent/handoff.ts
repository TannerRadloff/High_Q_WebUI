import { z } from 'zod';
import { Agent, AgentContext, HandoffInputFilter } from './agent';

/**
 * Represents a customized handoff to an agent
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
 * Default function to generate a tool name for a handoff
 */
export function defaultToolName(agentName: string): string {
  return `transfer_to_${agentName.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Default function to generate a tool description for a handoff
 */
export function defaultToolDescription(agentName: string): string {
  return `Transfer the conversation to the ${agentName}`;
}

/**
 * Creates a customized handoff to an agent
 * 
 * @param agent The agent to hand off to
 * @param options Optional customization options
 * @returns A Handoff object
 */
export function handoff(
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
 * Common handoff filters
 */
export const handoffFilters = {
  /**
   * Removes all tool calls from the conversation history
   */
  removeAllTools: (input: any): any => {
    if (!input || !input.messages) return input;
    
    return {
      ...input,
      messages: input.messages.filter((msg: any) => 
        !msg.function_call && !msg.tool_calls
      )
    };
  },
  
  /**
   * Preserves only the last N messages
   */
  preserveLastN: (n: number) => (input: any): any => {
    if (!input || !input.messages) return input;
    
    return {
      ...input,
      messages: input.messages.slice(-n)
    };
  }
};

/**
 * Recommended prompt prefix for handoffs
 */
export const RECOMMENDED_PROMPT_PREFIX = `
You are part of a system with multiple specialized agents. 
If a user request falls outside your expertise or would be better handled by another agent, 
you should use one of the available handoff tools to transfer the conversation.

When deciding whether to handoff:
1. Consider if the request is within your specific domain expertise
2. If it's outside your domain or another agent would handle it more effectively, use a handoff
3. Provide clear reasoning for the handoff in the 'reason' field

`;

/**
 * Adds the recommended handoff instructions to a prompt
 */
export function promptWithHandoffInstructions(basePrompt: string): string {
  return `${RECOMMENDED_PROMPT_PREFIX}${basePrompt}`;
} 