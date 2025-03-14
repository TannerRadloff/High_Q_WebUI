export interface Agent {
  id: string;
  type: AgentType;
  position: {
    x: number;
    y: number;
  };
  config: {
    name: string;
    instructions: string;
    model: ModelType;
    tools: AgentTool[];
  };
}

export interface Connection {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  label?: string;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  agents: Agent[];
  connections: Connection[];
  entryPointAgentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AgentType {
  RESEARCH = 'research',
  REPORT = 'report',
  JUDGE = 'judge',
  CODING = 'coding',
  CREATIVE = 'creative'
}

export enum ModelType {
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o',
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku'
}

export const AGENT_TEMPLATES: Record<AgentType, Partial<Agent>> = {
  [AgentType.RESEARCH]: {
    type: AgentType.RESEARCH,
    config: {
      name: 'Research Agent',
      instructions: 'Find information and answer factual questions. Be thorough and cite your sources.',
      model: ModelType.GPT_4O,
      tools: []
    }
  },
  [AgentType.REPORT]: {
    type: AgentType.REPORT,
    config: {
      name: 'Report Agent',
      instructions: 'Create structured reports and summaries. Organize information in a clear and readable format.',
      model: ModelType.GPT_4O,
      tools: []
    }
  },
  [AgentType.JUDGE]: {
    type: AgentType.JUDGE,
    config: {
      name: 'Judge Agent',
      instructions: 'Evaluate options and make decisions. Consider all arguments fairly and provide reasoning for your conclusions.',
      model: ModelType.GPT_4O,
      tools: []
    }
  },
  [AgentType.CODING]: {
    type: AgentType.CODING,
    config: {
      name: 'Coding Agent',
      instructions: 'Write and review code. Follow best practices and ensure code is efficient, readable, and secure.',
      model: ModelType.GPT_4O,
      tools: []
    }
  },
  [AgentType.CREATIVE]: {
    type: AgentType.CREATIVE,
    config: {
      name: 'Creative Agent',
      instructions: 'Generate creative content and ideas. Think outside the box and provide innovative solutions.',
      model: ModelType.GPT_4O,
      tools: []
    }
  }
}; 