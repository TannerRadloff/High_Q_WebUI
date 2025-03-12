import { BaseAgent } from './BaseAgent';
import { DelegationAgent } from '../orchestrator';
import { TriageAgent } from './TriageAgent';
import { ResearchAgent } from './ResearchAgent';
import { ReportAgent } from './ReportAgent';
import { AgentConfig, AgentContext } from './agent';
import { z } from 'zod';

/**
 * Agent types supported by the factory
 */
export enum AgentType {
  DELEGATION = 'delegation',
  TRIAGE = 'triage',
  RESEARCH = 'research',
  REPORT = 'report',
  CUSTOM = 'custom'
}

/**
 * Factory for creating agents with consistent configuration
 */
export class AgentFactory {
  // Default settings for all agents
  private defaultModel: string = 'gpt-4o';
  private defaultTemperature: number = 0.7;
  
  // Store agent instances for potential reuse
  private agents: Map<string, BaseAgent> = new Map();
  
  /**
   * Create an agent of the specified type
   */
  createAgent<T = string>(
    type: AgentType,
    config?: Partial<AgentConfig<T>>
  ): BaseAgent<T> {
    // Generate a cache key based on type and important config options
    const cacheKey = this.generateCacheKey(type, config);
    
    // Check if we already have this agent cached
    if (this.agents.has(cacheKey)) {
      return this.agents.get(cacheKey) as BaseAgent<T>;
    }
    
    let agent: BaseAgent<T>;
    
    switch (type) {
      case AgentType.DELEGATION:
        agent = new DelegationAgent() as unknown as BaseAgent<T>;
        break;
        
      case AgentType.TRIAGE:
        agent = new TriageAgent() as unknown as BaseAgent<T>;
        break;
        
      case AgentType.RESEARCH:
        agent = new ResearchAgent() as unknown as BaseAgent<T>;
        break;
        
      case AgentType.REPORT:
        agent = new ReportAgent() as unknown as BaseAgent<T>;
        break;
        
      case AgentType.CUSTOM:
        // For custom agents, we require a config
        if (!config) {
          throw new Error('Config is required for custom agents');
        }
        
        // Apply defaults to the config
        const completeConfig = this.applyDefaults(config);
        
        agent = new BaseAgent<T>(completeConfig as AgentConfig<T>);
        break;
        
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
    
    // Apply any overrides from the config
    if (config) {
      agent = agent.clone(config) as BaseAgent<T>;
    }
    
    // Cache the agent
    this.agents.set(cacheKey, agent as BaseAgent);
    
    return agent;
  }
  
  /**
   * Generate a cache key for an agent configuration
   */
  private generateCacheKey(type: AgentType, config?: Partial<AgentConfig>): string {
    // If no config, just use the type
    if (!config) {
      return type;
    }
    
    // Include important config options in the key
    const key = [
      type,
      config.name,
      config.model,
      config.modelSettings?.temperature
    ].filter(Boolean).join(':');
    
    return key;
  }
  
  /**
   * Apply default settings to a configuration
   */
  private applyDefaults<T>(config: Partial<AgentConfig<T>>): AgentConfig<T> {
    return {
      name: config.name || 'CustomAgent',
      instructions: config.instructions || 'You are a helpful assistant.',
      model: config.model || this.defaultModel,
      modelSettings: {
        temperature: this.defaultTemperature,
        ...config.modelSettings
      },
      tools: config.tools || [],
      handoffs: config.handoffs || [],
      outputType: config.outputType
    } as AgentConfig<T>;
  }
  
  /**
   * Update the default settings for all agents
   */
  setDefaults(options: {
    model?: string;
    temperature?: number;
  }): void {
    if (options.model) {
      this.defaultModel = options.model;
    }
    
    if (options.temperature !== undefined) {
      this.defaultTemperature = options.temperature;
    }
  }
  
  /**
   * Clear the agent cache
   */
  clearCache(): void {
    this.agents.clear();
  }
  
  /**
   * Create a specialized delegation workflow with multiple agents
   */
  createDelegationWorkflow(): BaseAgent {
    // Create the specialized agents
    const triageAgent = this.createAgent(AgentType.TRIAGE);
    const researchAgent = this.createAgent(AgentType.RESEARCH);
    const reportAgent = this.createAgent(AgentType.REPORT);
    
    // Create a delegation agent that can coordinate between them
    return this.createAgent(AgentType.CUSTOM, {
      name: 'WorkflowOrchestrator',
      instructions: (context: AgentContext) => {
        const userName = context.userName || 'user';
        
        return `You are an orchestration agent that helps ${userName} by delegating tasks to specialized agents.
        
        Your job is to analyze the request and determine which specialized agent can best handle it:
        - TriageAgent: For analyzing and categorizing tasks
        - ResearchAgent: For finding current information and answering factual questions
        - ReportAgent: For formatting information and creating structured reports
        
        You should make use of the appropriate agent tools based on the task requirements.`;
      },
      model: 'gpt-4o',
      modelSettings: {
        temperature: 0.3 
      },
      tools: [
        triageAgent.asTool('use_triage_agent', 'Analyze and categorize the user query'),
        researchAgent.asTool('use_research_agent', 'Search for information to answer factual questions'),
        reportAgent.asTool('use_report_agent', 'Format information into a structured report')
      ]
    });
  }
} 