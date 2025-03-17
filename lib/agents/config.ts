/**
 * Configuration for the agent system
 */

// Default model to use for agents
export const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4';

// API keys
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Agent-specific settings
export const AGENT_SETTINGS = {
  mimir: {
    model: process.env.MIMIR_MODEL || DEFAULT_MODEL,
    temperature: parseFloat(process.env.MIMIR_TEMPERATURE || '0.7'),
  },
  research: {
    model: process.env.RESEARCH_AGENT_MODEL || DEFAULT_MODEL,
    temperature: parseFloat(process.env.RESEARCH_AGENT_TEMPERATURE || '0.7'),
  },
  coding: {
    model: process.env.CODING_AGENT_MODEL || DEFAULT_MODEL,
    temperature: parseFloat(process.env.CODING_AGENT_TEMPERATURE || '0.3'),
  },
  dataAnalysis: {
    model: process.env.DATA_ANALYSIS_AGENT_MODEL || DEFAULT_MODEL,
    temperature: parseFloat(process.env.DATA_ANALYSIS_AGENT_TEMPERATURE || '0.3'),
  },
  writing: {
    model: process.env.WRITING_AGENT_MODEL || DEFAULT_MODEL,
    temperature: parseFloat(process.env.WRITING_AGENT_TEMPERATURE || '0.7'),
  },
};

// Validate configuration
export function validateConfig() {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is not set. Agents will not function properly.');
    return false;
  }
  return true;
}

// Export a function to get agent settings
export function getAgentSettings(agentType: string) {
  switch (agentType.toLowerCase()) {
    case 'mimir':
      return AGENT_SETTINGS.mimir;
    case 'research':
      return AGENT_SETTINGS.research;
    case 'coding':
      return AGENT_SETTINGS.coding;
    case 'dataanalysis':
      return AGENT_SETTINGS.dataAnalysis;
    case 'writing':
      return AGENT_SETTINGS.writing;
    default:
      return {
        model: DEFAULT_MODEL,
        temperature: 0.7,
      };
  }
} 