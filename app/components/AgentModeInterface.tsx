'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentType } from '../../agents/AgentFactory';
import AgentStateService, { AgentRequest } from '../../services/agentStateService';
import { Button } from '@/components/ui/button';
import { BotIcon } from '@/components/icons';

// Agent configuration with descriptions and capabilities
const agentConfigs = [
  { 
    id: 'delegation', 
    name: 'Delegation', 
    type: AgentType.DELEGATION, 
    description: 'Analyzes your request and delegates to specialized agents',
    capabilities: ['Task routing', 'Multi-agent coordination', 'Complex request handling']
  },
  { 
    id: 'research', 
    name: 'Research', 
    type: AgentType.RESEARCH, 
    description: 'Finds information and answers factual questions',
    capabilities: ['Information retrieval', 'Fact checking', 'Data analysis']
  },
  { 
    id: 'report', 
    name: 'Report', 
    type: AgentType.REPORT, 
    description: 'Formats information into structured reports',
    capabilities: ['Content organization', 'Data visualization', 'Summary generation']
  },
  { 
    id: 'triage', 
    name: 'Triage', 
    type: AgentType.TRIAGE, 
    description: 'Analyzes and categorizes tasks',
    capabilities: ['Priority assessment', 'Task categorization', 'Workflow optimization']
  },
  { 
    id: 'judge', 
    name: 'Judge', 
    type: AgentType.JUDGE, 
    description: 'Evaluates responses and provides feedback',
    capabilities: ['Quality assessment', 'Feedback generation', 'Improvement suggestions']
  }
];

// Helper function to format timestamps
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AgentModeInterface() {
  // State for user input
  const [userInput, setUserInput] = useState('');
  
  // State for agent operations
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(AgentType.DELEGATION);
  const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom when new messages appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [agentRequests]);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [userInput]);

  // Load agent requests from the service
  useEffect(() => {
    // Get recent requests
    setAgentRequests(AgentStateService.getRequests({ limit: 10 }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim() || isProcessing) return;
    
    // Create a new request
    const newRequest: AgentRequest = {
      id: `req-${Date.now()}`,
      query: userInput,
      agentType: selectedAgent,
      timestamp: Date.now(),
      status: 'in-progress'
    };
    
    // Record the request
    AgentStateService.recordRequest(newRequest);
    
    // Update UI
    setAgentRequests(prev => [newRequest, ...prev]);
    setUserInput('');
    setIsProcessing(true);
    
    try {
      // In a real implementation, this would call the OpenAI Agents SDK
      // For now, we'll simulate the response
      setTimeout(() => {
        // Update request with response
        const updatedRequest = AgentStateService.updateRequest(newRequest.id, { 
          status: 'completed',
          response: `This is a response from the ${selectedAgent} Agent for your query: "${newRequest.query}". In a real implementation, this would be processed by the OpenAI Agents SDK.`,
          metadata: {
            executionTimeMs: 2500,
            handoffPath: selectedAgent === AgentType.DELEGATION ? ['TRIAGE', 'RESEARCH'] : undefined
          }
        });
        
        // Update UI with the response
        setAgentRequests(prev => 
          prev.map(req => req.id === newRequest.id ? updatedRequest || req : req)
        );
        
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error('Error processing agent request:', error);
      
      // Update request with error
      const updatedRequest = AgentStateService.updateRequest(newRequest.id, { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Update UI with the error
      setAgentRequests(prev => 
        prev.map(req => req.id === newRequest.id ? updatedRequest || req : req)
      );
      
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Agent selection bar */}
      <div className="border-b p-2 flex items-center gap-2 overflow-x-auto">
        {agentConfigs.map(agent => (
          <Button
            key={agent.id}
            variant={selectedAgent === agent.type ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 whitespace-nowrap ${
              selectedAgent === agent.type ? "bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => setSelectedAgent(agent.type)}
          >
            <BotIcon size={16} />
            <span>{agent.name}</span>
          </Button>
        ))}
      </div>
      
      {/* Chat container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Welcome message */}
        {agentRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BotIcon size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Welcome to Agent Mode</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Select an agent type above and start a conversation. The agent will process your request using the OpenAI Agents SDK.
            </p>
            <div className="text-sm text-muted-foreground">
              Currently using: <span className="font-medium text-foreground">{agentConfigs.find(a => a.type === selectedAgent)?.name} Agent</span>
            </div>
          </div>
        )}

        {/* Conversation history */}
        {agentRequests.map(request => (
          <div key={request.id} id={`request-${request.id}`} className="space-y-4">
            {/* User message */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium">You</span>
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-lg p-3">
                  <p>{request.query}</p>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>{formatTimestamp(request.timestamp)}</span>
                  <span>Sent to {request.agentType} Agent</span>
                </div>
              </div>
            </div>
            
            {/* Agent response */}
            {(request.status === 'completed' || request.status === 'failed') && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <BotIcon size={16} />
                </div>
                <div className="flex-1">
                  <div className="bg-card border rounded-lg p-3">
                    {request.status === 'completed' ? (
                      <p>{request.response}</p>
                    ) : (
                      <p className="text-destructive">
                        Error: {request.error || 'There was an error processing your request. Please try again.'}
                      </p>
                    )}
                    
                    {/* Show metadata if available */}
                    {request.metadata && request.status === 'completed' && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        {request.metadata.handoffPath && (
                          <div className="flex items-center gap-1 mt-1">
                            <span>Agent path:</span>
                            <div className="flex items-center">
                              {request.metadata.handoffPath.map((agent, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <span className="mx-1">→</span>}
                                  <span className="px-1.5 py-0.5 bg-muted rounded text-xs">{agent}</span>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                        {request.metadata.executionTimeMs && (
                          <div className="mt-1">
                            Execution time: {(request.metadata.executionTimeMs / 1000).toFixed(1)}s
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span>{formatTimestamp(request.timestamp + (request.metadata?.executionTimeMs || 2000))}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Processing indicator */}
            {request.status === 'in-progress' && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <BotIcon size={16} />
                </div>
                <div className="flex-1">
                  <div className="bg-card border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="h-2 w-2 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {request.agentType} Agent is processing...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full border rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none min-h-[40px]"
              placeholder={`Ask the ${agentConfigs.find(a => a.type === selectedAgent)?.name} Agent...`}
              rows={1}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={isProcessing || !userInput.trim()}
            className="h-auto py-2"
          >
            {isProcessing ? 'Processing...' : 'Send'}
          </Button>
        </form>
        <div className="text-xs text-muted-foreground mt-1">
          Press Enter to send. Shift+Enter for new line.
        </div>
      </div>
    </div>
  );
} 

