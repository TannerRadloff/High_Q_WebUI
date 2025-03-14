import { AgentType } from '@/agents/AgentFactory';

/**
 * Centralized configuration for agent types
 * Provides consistent descriptions and capabilities used across the application
 */
export const agentTypeConfig = [
  { 
    id: 'default', 
    name: 'Standard Chat', 
    description: 'Regular chat with the AI model',
    capabilities: ['Text generation', 'Question answering', 'Basic assistance']
  },
  { 
    id: AgentType.DELEGATION.toLowerCase(), 
    name: 'Delegation', 
    description: 'Analyzes your request and delegates to specialized agents',
    capabilities: ['Task routing', 'Multi-agent coordination', 'Complex request handling']
  },
  { 
    id: AgentType.RESEARCH.toLowerCase(), 
    name: 'Research', 
    description: 'Finds information and answers factual questions',
    capabilities: ['Information retrieval', 'Fact checking', 'Data analysis']
  },
  { 
    id: AgentType.REPORT.toLowerCase(), 
    name: 'Report', 
    description: 'Formats information into structured reports',
    capabilities: ['Content organization', 'Data visualization', 'Summary generation']
  },
  { 
    id: AgentType.TRIAGE.toLowerCase(), 
    name: 'Triage', 
    description: 'Analyzes and categorizes tasks',
    capabilities: ['Priority assessment', 'Task categorization', 'Workflow optimization']
  },
  { 
    id: AgentType.JUDGE.toLowerCase(), 
    name: 'Judge', 
    description: 'Evaluates responses and provides feedback',
    capabilities: ['Quality assessment', 'Feedback generation', 'Improvement suggestions']
  }
];

/**
 * Get agent config by ID
 */
export function getAgentConfigById(id: string) {
  return agentTypeConfig.find(agent => agent.id === id.toLowerCase());
}

/**
 * Get agent config by AgentType enum
 */
export function getAgentConfigByType(type: AgentType) {
  return agentTypeConfig.find(agent => agent.id === type.toLowerCase());
} 