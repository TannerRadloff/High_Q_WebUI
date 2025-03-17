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
    isCustom?: boolean;
    icon?: string;
    specialization?: string; // Describes what this agent variant specializes in
    parentType?: AgentType; // Used for tracking which agent type this is a variant of
  };
}

export interface SavedAgentConfig {
  id: string;
  name: string;
  type: AgentType;
  instructions: string;
  model: ModelType;
  tools: AgentTool[];
  icon: string;
  specialization: string;
  createdAt: Date;
  updatedAt: Date;
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
  BASE = 'base',
  RESEARCH = 'research',
  REPORT = 'report',
  JUDGE = 'judge',
  CODING = 'coding',
  CREATIVE = 'creative',
  DELEGATE = 'delegate'
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

// Default agent icons
export const AGENT_ICONS: Record<AgentType, string> = {
  [AgentType.BASE]: '🤖',
  [AgentType.RESEARCH]: '🔍',
  [AgentType.REPORT]: '📊',
  [AgentType.JUDGE]: '⚖️',
  [AgentType.CODING]: '💻',
  [AgentType.CREATIVE]: '🎨',
  [AgentType.DELEGATE]: '👨‍💼'
};

// Base agent template that all custom agents are derived from
export const BASE_AGENT_TEMPLATE: Partial<Agent> = {
  type: AgentType.BASE,
  config: {
    name: 'Base Agent',
    instructions: 'You are a helpful AI assistant. Respond to user queries effectively.',
    model: ModelType.GPT_4O,
    tools: [],
    icon: AGENT_ICONS[AgentType.BASE]
  }
};

// Pre-configured agent templates
export const AGENT_TEMPLATES: Record<AgentType, Partial<Agent>> = {
  [AgentType.BASE]: BASE_AGENT_TEMPLATE,
  [AgentType.RESEARCH]: {
    type: AgentType.RESEARCH,
    config: {
      name: 'Research Agent',
      instructions: 'Find information and answer factual questions. Be thorough and cite your sources.',
      model: ModelType.GPT_4O,
      tools: [],
      icon: AGENT_ICONS[AgentType.RESEARCH],
      parentType: AgentType.BASE
    }
  },
  [AgentType.REPORT]: {
    type: AgentType.REPORT,
    config: {
      name: 'Report Agent',
      instructions: 'Create structured reports and summaries. Organize information in a clear and readable format.',
      model: ModelType.GPT_4O,
      tools: [],
      icon: AGENT_ICONS[AgentType.REPORT],
      parentType: AgentType.BASE
    }
  },
  [AgentType.JUDGE]: {
    type: AgentType.JUDGE,
    config: {
      name: 'Judge Agent',
      instructions: 'Evaluate options and make decisions. Consider all arguments fairly and provide reasoning for your conclusions.',
      model: ModelType.GPT_4O,
      tools: [],
      icon: AGENT_ICONS[AgentType.JUDGE],
      parentType: AgentType.BASE
    }
  },
  [AgentType.CODING]: {
    type: AgentType.CODING,
    config: {
      name: 'Coding Agent',
      instructions: 'Write and review code. Follow best practices and ensure code is efficient, readable, and secure.',
      model: ModelType.GPT_4O,
      tools: [],
      icon: AGENT_ICONS[AgentType.CODING],
      parentType: AgentType.BASE
    }
  },
  [AgentType.CREATIVE]: {
    type: AgentType.CREATIVE,
    config: {
      name: 'Creative Agent',
      instructions: 'Generate creative content and ideas. Think outside the box and provide innovative solutions.',
      model: ModelType.GPT_4O,
      tools: [],
      icon: AGENT_ICONS[AgentType.CREATIVE],
      parentType: AgentType.BASE
    }
  },
  [AgentType.DELEGATE]: {
    type: AgentType.DELEGATE,
    config: {
      name: 'Delegation Agent',
      instructions: 'You are the primary delegation agent responsible for receiving user queries and directing them to appropriate specialist agents. Understand what the user is asking for, then delegate to the most suitable agent. Monitor the workflow and ensure tasks are properly handed off between agents.',
      model: ModelType.GPT_4O,
      tools: [],
      icon: AGENT_ICONS[AgentType.DELEGATE],
      parentType: AgentType.BASE
    }
  }
}; 