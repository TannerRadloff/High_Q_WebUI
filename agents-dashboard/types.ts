/**
 * Interface for Agent configurations
 */
export interface Agent {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  config: {
    name: string;
    instructions: string;
    model: string;
    tools: AgentTool[];
  };
}

/**
 * Interface for connections between agents
 */
export interface Connection {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

/**
 * Interface for agent tools
 */
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters?: ToolParameter[];
}

/**
 * Interface for tool parameters
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * Interface for a complete workflow
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  agents: Agent[];
  connections: Connection[];
  entryPointAgentId: string; // ID of the agent where the workflow starts
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Available agent types
 */
export enum AgentType {
  RESEARCH = 'Research',
  REPORT = 'Report',
  JUDGE = 'Judge',
  CODING = 'Coding',
  CREATIVE = 'Creative',
}

/**
 * Available LLM models
 */
export enum ModelType {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4 = 'gpt-4',
  GPT_35_TURBO = 'gpt-3.5-turbo',
}

/**
 * Predefined agent templates
 */
export const AGENT_TEMPLATES: Record<AgentType, Partial<Agent>> = {
  [AgentType.RESEARCH]: {
    type: AgentType.RESEARCH,
    config: {
      name: 'Research Agent',
      instructions: 'You are a research agent focused on finding information and answering factual questions accurately. Use search tools to gather up-to-date information when needed.',
      model: ModelType.GPT_4O,
      tools: [],
    }
  },
  [AgentType.REPORT]: {
    type: AgentType.REPORT,
    config: {
      name: 'Report Agent',
      instructions: 'You are a report agent skilled at creating well-structured summaries and reports. Organize information clearly with appropriate formatting.',
      model: ModelType.GPT_4O,
      tools: [],
    }
  },
  [AgentType.JUDGE]: {
    type: AgentType.JUDGE,
    config: {
      name: 'Judge Agent',
      instructions: 'You are a judge agent capable of evaluating options and making balanced decisions. Consider all perspectives and provide well-reasoned assessments.',
      model: ModelType.GPT_4O,
      tools: [],
    }
  },
  [AgentType.CODING]: {
    type: AgentType.CODING,
    config: {
      name: 'Coding Agent',
      instructions: 'You are a coding agent specializing in writing and reviewing code. Follow best practices and produce clean, efficient, and well-documented code.',
      model: ModelType.GPT_4O,
      tools: [],
    }
  },
  [AgentType.CREATIVE]: {
    type: AgentType.CREATIVE,
    config: {
      name: 'Creative Agent',
      instructions: 'You are a creative agent focused on generating innovative ideas and content. Be imaginative while still maintaining relevance to the task.',
      model: ModelType.GPT_4O,
      tools: [],
    }
  },
}; 