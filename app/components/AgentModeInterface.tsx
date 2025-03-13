'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AgentType } from '../../agents/AgentFactory';
import AgentStateService, { AgentState, AgentRequest } from '../../services/agentStateService';

// Initial set of available agents
const availableAgents = [
  { id: 'delegation', name: 'Delegation Agent', type: AgentType.DELEGATION, description: 'Analyzes your request and delegates to specialized agents' },
  { id: 'research', name: 'Research Agent', type: AgentType.RESEARCH, description: 'Finds information and answers factual questions' },
  { id: 'report', name: 'Report Agent', type: AgentType.REPORT, description: 'Formats information into structured reports' },
  { id: 'triage', name: 'Triage Agent', type: AgentType.TRIAGE, description: 'Analyzes and categorizes tasks' },
  { id: 'custom', name: 'Custom Workflow', type: AgentType.CUSTOM, description: 'Uses multiple agents in a specialized workflow' }
];

// Helper function to format timestamps
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AgentModeInterface() {
  // State for user input
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // State for agent operations
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(AgentType.DELEGATION);
  const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);
  const [activeAgents, setActiveAgents] = useState<AgentState[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom when new messages appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [agentRequests, currentResponse]);

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

  // Load agent states and requests from the service
  useEffect(() => {
    // Get all agent states
    setActiveAgents(AgentStateService.getAgentStates());
    
    // Get recent requests
    setAgentRequests(AgentStateService.getRequests({ limit: 10 }));
    
    // Set up polling to refresh agent states every 5 seconds
    const interval = setInterval(() => {
      setActiveAgents(AgentStateService.getAgentStates());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
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
    
    // Add to requests
    setAgentRequests(prev => [newRequest, ...prev]);
    
    // Clear input
    setUserInput('');
    
    // Set processing state
    setIsProcessing(true);
    
    // Simulate agent processing
    setTimeout(() => {
      // Update request with response
      setAgentRequests(prev => 
        prev.map(req => 
          req.id === newRequest.id 
            ? { 
                ...req, 
                status: 'completed',
                response: `This is a simulated response from the ${selectedAgent} Agent for your query: "${userInput}". In a real implementation, this would be processed by the AI agent.`
              } 
            : req
        )
      );
      
      setIsProcessing(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Main chat container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-6"
          >
            {/* Welcome message */}
            {agentRequests.length === 0 && (
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold mb-2">Welcome to Agent Mode</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Choose an agent and start a conversation. <br />
                  The agent will process your request and return a response.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {availableAgents.map(agent => (
                    <div 
                      key={agent.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedAgent === agent.type ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setSelectedAgent(agent.type)}
                    >
                      <h4 className="font-medium">{agent.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{agent.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation history */}
            {agentRequests.map(request => (
              <div key={request.id} id={`request-${request.id}`} className="space-y-4">
                {/* User message */}
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mr-2">
                    <span className="text-sm font-bold">U</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
                      <p>{request.query}</p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                      <span>{formatTimestamp(request.timestamp)}</span>
                      <span>Sent to {request.agentType} Agent</span>
                    </div>
                  </div>
                </div>
                
                {/* Agent response */}
                {(request.status === 'completed' || request.status === 'failed') && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center mr-2">
                      <span className="text-sm font-bold text-white">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        {request.status === 'completed' ? (
                          <p>{request.response}</p>
                        ) : (
                          <p className="text-red-500">
                            Sorry, there was an error processing your request. Please try again.
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{formatTimestamp(request.timestamp + 3000)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Processing indicator */}
                {request.status === 'in-progress' && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center mr-2">
                      <span className="text-sm font-bold text-white">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse flex space-x-1">
                            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="border-t p-4 bg-white dark:bg-gray-800">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  className="w-full border dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-900"
                  placeholder={`Ask the ${selectedAgent} Agent...`}
                  rows={1}
                  value={userInput}
                  onChange={(e) => {
                    setIsTyping(true);
                    setUserInput(e.target.value);
                  }}
                  onBlur={() => setIsTyping(false)}
                  disabled={isProcessing}
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !userInput.trim()}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isProcessing || !userInput.trim()
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Send'}
              </button>
            </form>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Press Enter to send. Agent: {availableAgents.find(a => a.type === selectedAgent)?.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 

