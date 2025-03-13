import { BaseAgent } from './BaseAgent';
import { AgentRunner } from '../runner';
import { TriageAgent } from './TriageAgent';
import { ResearchAgent } from './ResearchAgent';
import { ReportAgent } from './ReportAgent';
import { JudgeAgent } from './JudgeAgent';
import { AgentConfig, AgentContext } from './agent';
import { improveWithFeedback } from './improvement';

/**
 * Agent types supported by the factory
 */
export enum AgentType {
  DELEGATION = 'delegation',
  TRIAGE = 'triage',
  RESEARCH = 'research',
  REPORT = 'report',
  JUDGE = 'judge',
  CUSTOM = 'custom'
}

/**
 * Simplified factory for creating agents
 * This version removes unnecessary caching and complexity
 */
export class AgentFactory {
  // Default settings for all agents
  private defaultModel: string = 'gpt-4o';
  private defaultTemperature: number = 0.7;
  
  /**
   * Set default settings for all agents created by this factory
   */
  setDefaults({ model, temperature }: { model?: string; temperature?: number } = {}): void {
    if (model) this.defaultModel = model;
    if (temperature !== undefined) this.defaultTemperature = temperature;
  }
  
  /**
   * Clear any cached resources (placeholder for backwards compatibility)
   */
  clearCache(): void {
    // No caching in this implementation
    // Method exists for backwards compatibility
  }

  /**
   * Create an agent of the specified type
   */
  createAgent<T = string>(
    type: AgentType,
    config?: Partial<AgentConfig<T>>
  ): BaseAgent<T> {
    let agent: BaseAgent<T>;
    
    switch (type) {
      case AgentType.DELEGATION:
        // Create a basic delegation agent with default settings
        agent = new BaseAgent({
          name: 'DelegationAgent',
          instructions: 'You are an agent that delegates tasks to specialized agents.',
          model: this.defaultModel,
          modelSettings: {
            temperature: this.defaultTemperature
          }
        }) as unknown as BaseAgent<T>;
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
        
      case AgentType.JUDGE:
        agent = new JudgeAgent(config as any) as unknown as BaseAgent<T>;
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
    
    return agent;
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
   * Create a self-improving agent workflow 
   * that uses a judge to evaluate and improve responses
   */
  createSelfImprovingWorkflow(config: {
    primaryAgentType: AgentType;
    primaryAgentConfig?: Partial<AgentConfig>;
    judgeAgentConfig?: {
      model?: string;
      temperature?: number;
      evaluationCriteria?: string[];
    };
    improvementConfig?: {
      maxIterations?: number;
      minAcceptableScore?: number;
      timeout?: number;
    }
  } = { primaryAgentType: AgentType.RESEARCH }) {
    // Create the primary agent
    const primaryAgent = this.createAgent(
      config.primaryAgentType,
      config.primaryAgentConfig
    );
    
    // Create the judge agent
    const judgeAgent = this.createAgent(
      AgentType.JUDGE,
      {
        name: 'QualityJudge',
        model: config.judgeAgentConfig?.model || this.defaultModel,
        modelSettings: {
          temperature: config.judgeAgentConfig?.temperature || 0.3
        },
        ...config.judgeAgentConfig
      }
    ) as JudgeAgent;
    
    // Return a wrapper function that handles the improvement workflow
    return {
      async handleTask(query: string, context?: AgentContext) {
        const result = await improveWithFeedback(
          primaryAgent,
          judgeAgent,
          query,
          undefined,
          context,
          {
            maxIterations: config.improvementConfig?.maxIterations || 3,
            minAcceptableScore: config.improvementConfig?.minAcceptableScore || 8,
            timeout: config.improvementConfig?.timeout || 60000,
            verbose: true
          }
        );
        
        return result;
      }
    };
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
      name: 'WorkflowRunner',
      instructions: (context: AgentContext) => {
        // Simplified to avoid type errors with context properties
        return `You are an orchestration agent that helps the user by delegating tasks to specialized agents.
        
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