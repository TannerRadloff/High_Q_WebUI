import { AgentType } from '../agents/AgentFactory';

// Agent request interface
export interface AgentRequest {
  id: string;
  query: string;
  agentType: AgentType;
  timestamp: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  response?: string;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    handoffPath?: string[];
    [key: string]: any;
  };
}

// Agent state interface
export interface AgentState {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'working' | 'error';
  currentTask?: string;
  lastUpdated: number;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    averageResponseTimeMs: number;
  };
}

// In-memory storage for agent states and requests
const agentStates: AgentState[] = [
  {
    id: 'delegation-agent',
    name: 'Delegation Agent',
    type: AgentType.DELEGATION,
    status: 'idle',
    lastUpdated: Date.now(),
    stats: {
      totalRequests: 12,
      successfulRequests: 11,
      averageResponseTimeMs: 2500,
    },
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    type: AgentType.RESEARCH,
    status: 'idle',
    lastUpdated: Date.now() - 300000, // 5 minutes ago
    stats: {
      totalRequests: 8,
      successfulRequests: 7,
      averageResponseTimeMs: 4200,
    },
  },
  {
    id: 'report-agent',
    name: 'Report Agent',
    type: AgentType.REPORT,
    status: 'idle',
    lastUpdated: Date.now() - 600000, // 10 minutes ago
    stats: {
      totalRequests: 5,
      successfulRequests: 5,
      averageResponseTimeMs: 3100,
    },
  },
];

const agentRequests: AgentRequest[] = [];

// AgentStateService for managing agent states and requests
const AgentStateService = {
  // Get all agent states
  getAgentStates: (): AgentState[] => {
    return [...agentStates];
  },
  
  // Get agent state by type
  getAgentState: (agentType: AgentType): AgentState | undefined => {
    return agentStates.find(agent => agent.type === agentType);
  },
  
  // Update agent state
  updateAgentState: (
    agentType: AgentType, 
    status: 'idle' | 'working' | 'error',
    currentTask?: string
  ): AgentState | undefined => {
    const agentIndex = agentStates.findIndex(agent => agent.type === agentType);
    
    if (agentIndex === -1) return undefined;
    
    const updatedAgent = {
      ...agentStates[agentIndex],
      status,
      currentTask,
      lastUpdated: Date.now(),
    };
    
    agentStates[agentIndex] = updatedAgent;
    return updatedAgent;
  },
  
  // Get agent requests with optional filtering
  getRequests: ({ 
    limit = 10, 
    agentType,
    status,
  }: { 
    limit?: number; 
    agentType?: AgentType;
    status?: 'pending' | 'in-progress' | 'completed' | 'failed';
  } = {}): AgentRequest[] => {
    let filteredRequests = [...agentRequests];
    
    if (agentType) {
      filteredRequests = filteredRequests.filter(req => req.agentType === agentType);
    }
    
    if (status) {
      filteredRequests = filteredRequests.filter(req => req.status === status);
    }
    
    // Sort by timestamp (newest first)
    filteredRequests.sort((a, b) => b.timestamp - a.timestamp);
    
    return filteredRequests.slice(0, limit);
  },
  
  // Record a new agent request
  recordRequest: (request: AgentRequest): AgentRequest => {
    agentRequests.unshift(request);
    
    // Update agent stats
    const agentIndex = agentStates.findIndex(agent => agent.type === request.agentType);
    if (agentIndex !== -1) {
      agentStates[agentIndex].stats.totalRequests += 1;
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
      ...updates,
    };
    
    agentRequests[requestIndex] = updatedRequest;
    
    // Update agent stats if request is completed
    if (updates.status === 'completed') {
      const agentIndex = agentStates.findIndex(
        agent => agent.type === updatedRequest.agentType
      );
      
      if (agentIndex !== -1) {
        const agent = agentStates[agentIndex];
        agent.stats.successfulRequests += 1;
        
        // Update average response time if metadata is available
        if (updates.metadata?.executionTimeMs) {
          const { totalRequests, successfulRequests, averageResponseTimeMs } = agent.stats;
          
          // Calculate new average
          agent.stats.averageResponseTimeMs = 
            (averageResponseTimeMs * (successfulRequests - 1) + updates.metadata.executionTimeMs) / 
            successfulRequests;
        }
      }
    }
    
    return updatedRequest;
  },
};

export default AgentStateService; 