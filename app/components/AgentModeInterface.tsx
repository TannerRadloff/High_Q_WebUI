import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { AgentType } from '../../agents/AgentFactory';
import AgentStateService, { AgentState, AgentRequest as ServiceAgentRequest } from '../../services/agentStateService';

// Interface definition that matches the component needs
interface AgentRequest extends ServiceAgentRequest {}

// Initial set of available agents
const availableAgents = [
  { id: 'delegation', name: 'Delegation Agent', type: AgentType.DELEGATION, description: 'Analyzes your request and delegates to specialized agents' },
  { id: 'research', name: 'Research Agent', type: AgentType.RESEARCH, description: 'Finds information and answers factual questions' },
  { id: 'report', name: 'Report Agent', type: AgentType.REPORT, description: 'Formats information into structured reports' },
  { id: 'triage', name: 'Triage Agent', type: AgentType.TRIAGE, description: 'Analyzes and categorizes tasks' },
  { id: 'custom', name: 'Custom Workflow', type: AgentType.CUSTOM, description: 'Uses multiple agents in a specialized workflow' }
];

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

  // Handle submitting a new query to an agent
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isProcessing) return;
    
    // Create a new request
    const requestId = `req-${Date.now()}`;
    const newRequest: AgentRequest = {
      id: requestId,
      timestamp: new Date().toISOString(),
      query: userInput,
      agentType: selectedAgent,
      status: 'pending'
    };
    
    // Record the request in the service
    AgentStateService.recordRequest(newRequest);
    
    // Update local state
    setAgentRequests(prev => [newRequest, ...prev]);
    
    // Clear input and set processing state
    setUserInput('');
    setIsProcessing(true);
    setCurrentResponse('');
    
    try {
      // Update the agent's state to working
      AgentStateService.updateAgentState(
        selectedAgent, 
        'working', 
        userInput.substring(0, 50) + (userInput.length > 50 ? '...' : '')
      );
      
      // Update local agent states
      setActiveAgents(AgentStateService.getAgentStates());
      
      // Update request status to in-progress
      const updatedRequest = AgentStateService.updateRequest(requestId, { status: 'in-progress' });
      if (updatedRequest) {
        setAgentRequests(prev => 
          prev.map(req => req.id === requestId ? updatedRequest : req)
        );
      }
      
      // Make the API call to the agent endpoint
      const response = await fetch('/api/agent-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userInput,
          agentType: selectedAgent.toLowerCase(),
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error from agent API: ${response.statusText}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');
      
      const decoder = new TextDecoder();
      let streamedResponse = '';
      
      // Process the streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode and parse the chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('event: token')) {
            const data = JSON.parse(line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1));
            if (data.token) {
              streamedResponse += data.token;
              setCurrentResponse(streamedResponse);
            }
          } else if (line.startsWith('event: handoff')) {
            // Handle agent handoffs - in a real app, update UI to show handoff
            const data = JSON.parse(line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1));
            console.log('Agent handoff:', data);
          } else if (line.startsWith('event: complete')) {
            const data = JSON.parse(line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1));
            // Final update with complete response
            streamedResponse = data.content || streamedResponse;
            setCurrentResponse(streamedResponse);
            
            // Update request in the service
            const completedRequest = AgentStateService.updateRequest(requestId, {
              status: 'completed',
              response: streamedResponse,
              metadata: data.metadata
            });
            
            if (completedRequest) {
              // Update local request state
              setAgentRequests(prev => 
                prev.map(req => req.id === requestId ? completedRequest : req)
              );
            }
            
            // Reset agent state to idle
            AgentStateService.updateAgentState(selectedAgent, 'idle');
            setActiveAgents(AgentStateService.getAgentStates());
          } else if (line.startsWith('event: error')) {
            const data = JSON.parse(line.substring(line.indexOf('{'), line.lastIndexOf('}') + 1));
            
            // Update request with error
            const failedRequest = AgentStateService.updateRequest(requestId, {
              status: 'failed',
              error: data.message
            });
            
            if (failedRequest) {
              // Update local request state
              setAgentRequests(prev => 
                prev.map(req => req.id === requestId ? failedRequest : req)
              );
            }
            
            // Set agent state to error
            AgentStateService.updateAgentState(selectedAgent, 'error');
            setActiveAgents(AgentStateService.getAgentStates());
            
            throw new Error(data.message);
          }
        }
      }
    } catch (error) {
      console.error('Error processing agent request:', error);
      
      // Update request with error
      const failedRequest = AgentStateService.updateRequest(requestId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      if (failedRequest) {
        // Update local request state
        setAgentRequests(prev => 
          prev.map(req => req.id === requestId ? failedRequest : req)
        );
      }
      
      // Set agent state to error
      AgentStateService.updateAgentState(selectedAgent, 'error');
      setActiveAgents(AgentStateService.getAgentStates());
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Load more history
  const handleLoadMoreHistory = () => {
    const currentRequestCount = agentRequests.length;
    const moreRequests = AgentStateService.getRequests({ 
      limit: currentRequestCount + 10 
    });
    setAgentRequests(moreRequests);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header section with agent selection and controls */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Agent Mode</h2>
          <select 
            className="border rounded px-2 py-1 text-sm"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
          >
            {availableAgents.map(agent => (
              <option key={agent.id} value={agent.type}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded text-sm font-medium ${showHistory ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            History
          </button>
          <button 
            className={`px-3 py-1 rounded text-sm font-medium ${showAgentDetails ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setShowAgentDetails(!showAgentDetails)}
          >
            Agent Status
          </button>
        </div>
      </div>
      
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
                <p className="text-gray-600 mb-4">
                  Choose an agent and start a conversation. <br />
                  The agent will process your request and return a response.
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {availableAgents.map(agent => (
                    <div 
                      key={agent.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedAgent(agent.type)}
                    >
                      <h4 className="font-medium">{agent.name}</h4>
                      <p className="text-sm text-gray-600">{agent.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation history */}
            {agentRequests.map((request) => (
              <div key={request.id} className="space-y-4">
                {/* User message */}
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                    <span className="text-sm font-bold">U</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <p>{request.query}</p>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>{formatTimestamp(request.timestamp)}</span>
                      <span>Sent to {request.agentType} Agent</span>
                    </div>
                  </div>
                </div>
                
                {/* Agent response */}
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                    <span className="text-sm font-bold">A</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border rounded-lg p-3">
                      {request.status === 'pending' && <div className="animate-pulse">Processing...</div>}
                      {request.status === 'in-progress' && request.id === agentRequests[0]?.id && (
                        <ReactMarkdown className="prose prose-sm max-w-none">
                          {currentResponse || 'Processing your request...'}
                        </ReactMarkdown>
                      )}
                      {(request.status === 'completed' || (request.status === 'in-progress' && request.id !== agentRequests[0]?.id)) && (
                        <ReactMarkdown className="prose prose-sm max-w-none">
                          {request.response || 'No response received.'}
                        </ReactMarkdown>
                      )}
                      {request.status === 'failed' && (
                        <div className="text-red-600">
                          Error: {request.error || 'Unknown error occurred'}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                      {request.metadata?.executionTimeMs && (
                        <span>{(request.metadata.executionTimeMs / 1000).toFixed(2)}s</span>
                      )}
                    </div>
                    
                    {/* Handoff path display */}
                    {request.metadata?.handoffPath && request.metadata.handoffPath.length > 1 && (
                      <div className="mt-2 text-xs">
                        <div className="text-gray-500 mb-1">Agent workflow:</div>
                        <div className="flex items-center flex-wrap">
                          {request.metadata.handoffPath.map((agent, index) => (
                            <React.Fragment key={`${request.id}-${agent}-${index}`}>
                              <span className="bg-gray-100 rounded px-2 py-1">
                                {agent}
                              </span>
                              {index < request.metadata!.handoffPath!.length - 1 && (
                                <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Real-time streaming response */}
            {isProcessing && agentRequests.length > 0 && (
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                  <span className="text-sm font-bold">A</span>
                </div>
                <div className="flex-1">
                  <div className="bg-white border rounded-lg p-3">
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {currentResponse || 'Processing your request...'}
                    </ReactMarkdown>
                    <div className="h-4 w-4 ml-2 inline-block">
                      <div className="animate-pulse">▋</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input area */}
          <div className="border-t p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Send'}
              </button>
            </form>
            <div className="text-xs text-gray-500 mt-1">
              Press Enter to send. Agent: {availableAgents.find(a => a.type === selectedAgent)?.name}
            </div>
          </div>
        </div>
        
        {/* Sidebar for history and agent details */}
        <AnimatePresence>
          {(showHistory || showAgentDetails) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l bg-gray-50 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="p-3 border-b font-medium">
                  {showHistory ? 'Request History' : 'Agent Status'}
                </div>
                
                <div className="flex-1 overflow-y-auto p-3">
                  {showHistory && (
                    <div className="space-y-3">
                      {agentRequests.length === 0 ? (
                        <div className="text-gray-500 text-sm">No requests yet</div>
                      ) : (
                        <>
                          {agentRequests.map(req => (
                            <div 
                              key={req.id} 
                              className="border rounded bg-white p-2 text-sm hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                // Scroll to this request in the chat
                                const element = document.getElementById(`request-${req.id}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate">
                                  {req.query.length > 30 ? req.query.substring(0, 30) + '...' : req.query}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  req.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  req.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{req.agentType} Agent</span>
                                <span>{formatTimestamp(req.timestamp)}</span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Load more button */}
                          <button
                            onClick={handleLoadMoreHistory}
                            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                          >
                            Load more history
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {showAgentDetails && (
                    <div className="space-y-3">
                      {activeAgents.map(agent => (
                        <div 
                          key={agent.id} 
                          className="border rounded bg-white p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{agent.name}</span>
                            <span className={`h-2 w-2 rounded-full ${
                              agent.status === 'idle' ? 'bg-green-500' :
                              agent.status === 'working' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Status:</span>
                              <span>{agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Type:</span>
                              <span>{agent.type}</span>
                            </div>
                            {agent.currentTask && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Current task:</span>
                                <span className="truncate max-w-[150px]">{agent.currentTask}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-500">Last updated:</span>
                              <span>{formatTimestamp(agent.lastUpdated)}</span>
                            </div>
                          </div>
                          
                          {/* Agent stats */}
                          <div className="mt-3 border-t pt-2">
                            <div className="text-xs font-medium mb-1">Agent Stats</div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Total requests:</span>
                                <span>{agent.stats.totalRequests}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Success rate:</span>
                                <span>
                                  {agent.stats.totalRequests > 0 
                                    ? `${Math.round((agent.stats.successfulRequests / agent.stats.totalRequests) * 100)}%` 
                                    : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Avg. time:</span>
                                <span>
                                  {agent.stats.averageResponseTimeMs > 0 
                                    ? `${(agent.stats.averageResponseTimeMs / 1000).toFixed(1)}s` 
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 

