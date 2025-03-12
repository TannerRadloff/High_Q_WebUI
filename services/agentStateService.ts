import { AgentType } from '../agents/AgentFactory';

// Types for agent tracking
export interface AgentState {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'working' | 'error';
  currentTask?: string;
  lastUpdated: string;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTimeMs: number;
  };
}

export interface AgentRequest {
  id: string;
  timestamp: string;
  query: string;
  agentType: AgentType;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  response?: string;
  error?: string;
  metadata?: {
    handoffPath?: string[];
    executionTimeMs?: number;
    [key: string]: any;
  };
}

// In-memory storage (in a real app, this would be a database)
let activeAgents: AgentState[] = [];
let agentRequests: AgentRequest[] = [];

// Initialize with default agents
const initializeAgents = () => {
  if (activeAgents.length === 0) {
    activeAgents = [
      {
        id: 'delegation-agent',
        name: 'Delegation Agent',
        type: AgentType.DELEGATION,
        status: 'idle',
        lastUpdated: new Date().toISOString(),
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTimeMs: 0
        }
      },
      {
        id: 'research-agent',
        name: 'Research Agent',
        type: AgentType.RESEARCH,
        status: 'idle',
        lastUpdated: new Date().toISOString(),
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTimeMs: 0
        }
      },
      {
        id: 'report-agent',
        name: 'Report Agent',
        type: AgentType.REPORT,
        status: 'idle',
        lastUpdated: new Date().toISOString(),
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTimeMs: 0
        }
      },
      {
        id: 'triage-agent',
        name: 'Triage Agent',
        type: AgentType.TRIAGE,
        status: 'idle',
        lastUpdated: new Date().toISOString(),
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTimeMs: 0
        }
      }
    ];
  }
};

// Initialize on service import
initializeAgents();

export const AgentStateService = {
  // Get all agent states
  getAgentStates: (): AgentState[] => {
    return [...activeAgents];
  },
  
  // Get a specific agent state
  getAgentState: (agentId: string): AgentState | undefined => {
    return activeAgents.find(agent => agent.id === agentId);
  },
  
  // Update an agent's state
  updateAgentState: (
    agentType: AgentType, 
    status: 'idle' | 'working' | 'error', 
    currentTask?: string
  ): AgentState | undefined => {
    const agentIndex = activeAgents.findIndex(agent => agent.type === agentType);
    if (agentIndex === -1) return undefined;
    
    activeAgents[agentIndex] = {
      ...activeAgents[agentIndex],
      status,
      currentTask,
      lastUpdated: new Date().toISOString()
    };
    
    return activeAgents[agentIndex];
  },
  
  // Record a new agent request
  recordRequest: (request: AgentRequest): AgentRequest => {
    // Add to request history
    agentRequests.push(request);
    
    // Update agent stats for the request
    const agentIndex = activeAgents.findIndex(agent => agent.type === request.agentType);
    if (agentIndex !== -1) {
      const agent = activeAgents[agentIndex];
      agent.stats.totalRequests += 1;
      
      if (request.status === 'completed') {
        agent.stats.successfulRequests += 1;
        
        // Update average response time if available
        if (request.metadata?.executionTimeMs) {
          const prevTotal = agent.stats.averageResponseTimeMs * (agent.stats.successfulRequests - 1);
          agent.stats.averageResponseTimeMs = 
            (prevTotal + request.metadata.executionTimeMs) / agent.stats.successfulRequests;
        }
      } else if (request.status === 'failed') {
        agent.stats.failedRequests += 1;
      }
      
      // Update agent state
      activeAgents[agentIndex] = {
        ...agent,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return request;
  },
  
  // Update an existing request
  updateRequest: (
    requestId: string, 
    updates: Partial<AgentRequest>
  ): AgentRequest | undefined => {
    const requestIndex = agentRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) return undefined;
    
    const updatedRequest = {
      ...agentRequests[requestIndex],
      ...updates
    };
    
    agentRequests[requestIndex] = updatedRequest;
    
    // Update agent stats if status changed
    if (updates.status) {
      const agentIndex = activeAgents.findIndex(
        agent => agent.type === updatedRequest.agentType
      );
      
      if (agentIndex !== -1) {
        const agent = activeAgents[agentIndex];
        
        if (updates.status === 'completed' && 
            agentRequests[requestIndex].status !== 'completed') {
          agent.stats.successfulRequests += 1;
          
          // Update average response time if available
          if (updatedRequest.metadata?.executionTimeMs) {
            const prevTotal = agent.stats.averageResponseTimeMs * 
              (agent.stats.successfulRequests - 1);
            agent.stats.averageResponseTimeMs = 
              (prevTotal + updatedRequest.metadata.executionTimeMs) / 
              agent.stats.successfulRequests;
          }
        } else if (updates.status === 'failed' && 
                  agentRequests[requestIndex].status !== 'failed') {
          agent.stats.failedRequests += 1;
        }
        
        // Update agent state
        activeAgents[agentIndex] = {
          ...agent,
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    return updatedRequest;
  },
  
  // Get all requests, optionally filtered
  getRequests: (options?: {
    agentType?: AgentType;
    status?: 'pending' | 'in-progress' | 'completed' | 'failed';
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }): AgentRequest[] => {
    let filteredRequests = [...agentRequests];
    
    if (options?.agentType) {
      filteredRequests = filteredRequests.filter(
        req => req.agentType === options.agentType
      );
    }
    
    if (options?.status) {
      filteredRequests = filteredRequests.filter(
        req => req.status === options.status
      );
    }
    
    if (options?.startDate) {
      filteredRequests = filteredRequests.filter(
        req => new Date(req.timestamp) >= options.startDate!
      );
    }
    
    if (options?.endDate) {
      filteredRequests = filteredRequests.filter(
        req => new Date(req.timestamp) <= options.endDate!
      );
    }
    
    // Sort by timestamp, newest first
    filteredRequests.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply limit if specified
    if (options?.limit && options.limit > 0) {
      filteredRequests = filteredRequests.slice(0, options.limit);
    }
    
    return filteredRequests;
  },
  
  // Get a specific request
  getRequest: (requestId: string): AgentRequest | undefined => {
    return agentRequests.find(req => req.id === requestId);
  }
};

export default AgentStateService; 