'use client';

import { useState, useRef, useEffect } from 'react';
import { type Message } from 'ai';
import { Send, ArrowLeft, Search, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateUUID } from '@/lib/utils';
import { useAgentMode } from '@/hooks/use-agent-mode';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AgentActionLog, type AgentAction } from '@/components/agent-action-log';

// Enhanced message interface with streaming metadata
interface EnhancedMessage extends Message {
  isStreaming?: boolean;
  error?: string;
  metadata?: {
    // Triage metadata
    triageInProgress?: boolean;
    triageComplete?: boolean;
    taskType?: string;
    triageConfidence?: number;
    triageReasoning?: string;
    
    // Research metadata
    researchInProgress?: boolean;
    researchComplete?: boolean;
    researchStats?: {
      sources?: number;
      researchDataLength?: number;
    };
    
    // Report metadata
    reportInProgress?: boolean;
  };
}

// Enhanced message component for agent mode with streaming support
function AgentMessage({ message }: { message: EnhancedMessage }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-foreground'
      }`}>
        {message.role === 'assistant' && message.metadata?.triageInProgress && (
          <div className="text-sm text-purple-500 mb-1 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> 
            <span>Analyzing query type...</span>
          </div>
        )}
        
        {message.role === 'assistant' && message.metadata?.triageComplete && (
          <div className="text-sm text-indigo-500 mb-1">
            <div className="font-medium">Query analyzed as: {message.metadata.taskType}</div>
            {message.metadata.triageConfidence && (
              <div className="text-xs">Confidence: {(message.metadata.triageConfidence * 100).toFixed(1)}%</div>
            )}
          </div>
        )}
        
        {message.role === 'assistant' && message.metadata?.researchInProgress && (
          <div className="text-sm text-amber-500 mb-1 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> 
            <span>Researching the web...</span>
          </div>
        )}
        
        {message.role === 'assistant' && message.metadata?.researchComplete && (
          <div className="text-sm text-green-500 mb-1">
            Found information from {message.metadata.researchStats?.sources || 0} sources
          </div>
        )}
        
        {message.role === 'assistant' && message.metadata?.reportInProgress && (
          <div className="text-sm text-blue-500 mb-1 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Generating report...</span>
          </div>
        )}
        
        <div className="whitespace-pre-wrap">
          {message.role === 'assistant' ? (
            <>
              <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none">
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && <span className="cursor blink">│</span>}
            </>
          ) : (
            message.content
          )}
        </div>
        
        {message.error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{message.error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

type AgentType = 'auto' | 'triage' | 'research' | 'report' | 'orchestrator';

// Add reconnection mechanism
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000; // 2 seconds

// Add heartbeat monitoring
const HEARTBEAT_TIMEOUT = 30000; // 30 seconds
let lastHeartbeatTime = Date.now();
let heartbeatTimeoutId: NodeJS.Timeout | null = null;

export function AgentInterface() {
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('auto');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toggleAgentMode } = useAgentMode();
  
  // Load any previous agent messages from localStorage
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('agent-messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading saved agent messages:', error);
    }
  }, []);
  
  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('agent-messages', JSON.stringify(messages));
      }
    } catch (error) {
      console.error('Error saving agent messages:', error);
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Cleanup any active EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // Also clean up any heartbeat timeouts
      if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
        heartbeatTimeoutId = null;
      }
    };
  }, []);

  // Add a function to handle reconnection
  const handleReconnect = (lastMessageId: string, userQuery: string) => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      
      // Update the message with an error
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(m => m.id === lastMessageId);
        if (index !== -1) {
          newMessages[index].content = 'Connection lost. Maximum reconnection attempts reached.';
          newMessages[index].error = 'Unable to reconnect to server';
          newMessages[index].isStreaming = false;
        }
        return newMessages;
      });
      
      // Reset reconnect counter
      setReconnectAttempts(0);
      setIsLoading(false);
      return;
    }
    
    console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    // Update message to show reconnecting
    setMessages(prev => {
      const newMessages = [...prev];
      const index = newMessages.findIndex(m => m.id === lastMessageId);
      if (index !== -1) {
        newMessages[index].content += '\n\nConnection lost. Attempting to reconnect...';
      }
      return newMessages;
    });
    
    // Increment reconnect counter
    setReconnectAttempts(prev => prev + 1);
    
    // Try to reconnect after a delay
    setTimeout(() => {
      // Call the streaming submit again with the same query
      handleStreamingSubmit(null, lastMessageId, userQuery);
    }, RECONNECT_DELAY);
  };

  // Helper function to add a new agent action
  const addAgentAction = (type: AgentAction['type'], message: string, metadata?: Record<string, any>) => {
    const newAction: AgentAction = {
      id: generateUUID(),
      timestamp: Date.now(),
      type,
      message,
      metadata
    };
    
    setAgentActions(prev => [...prev, newAction]);
  };

  // Update handleStreamingSubmit to track actions
  const handleStreamingSubmit = async (
    e?: React.FormEvent | null,
    existingMessageId?: string,
    reconnectQuery?: string
  ) => {
    if (e) e.preventDefault();
    
    // Use either the input value or the reconnectQuery if provided
    const queryText = reconnectQuery || input;
    
    // Don't allow empty submissions
    if (!queryText.trim()) return;
    
    setIsLoading(true);
    
    // Track action: starting a new query
    if (!existingMessageId) {
      addAgentAction('start', 'Started processing query', { query: queryText });
    } else {
      addAgentAction('start', 'Reconnecting to query', { query: queryText });
    }
    
    // Create a unique ID for the assistant message or use existing one for reconnection
    const assistantMessageId = existingMessageId || generateUUID();
    
    // If this is not a reconnection attempt, create and add a new user message
    if (!existingMessageId) {
      // Add the user message
      const userMessage: EnhancedMessage = {
        id: generateUUID(),
        role: 'user',
        content: queryText,
      };
      
      // Add an empty assistant message (will be populated as the stream arrives)
      const assistantMessage: EnhancedMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        metadata: {
          // For 'auto' or 'triage', show triage in progress
          triageInProgress: selectedAgent === 'auto' || selectedAgent === 'triage',
          // For other agents, set appropriate flags
          researchInProgress: selectedAgent === 'research' || selectedAgent === 'orchestrator',
          reportInProgress: selectedAgent === 'report'
        }
      };
      
      // Update messages with user message and empty assistant message
      setMessages(prevMessages => [...prevMessages, userMessage, assistantMessage]);
      
      // Clear input if this is not a reconnection
      setInput('');
    } else {
      // For reconnection, just update the assistant message
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(m => m.id === assistantMessageId);
        if (index !== -1) {
          newMessages[index].isStreaming = true;
          // Append reconnecting message
          if (!newMessages[index].content.includes('Reconnected')) {
            newMessages[index].content += '\n\nReconnected. Resuming...';
          }
        }
        return newMessages;
      });
    }
    
    // Prepare the API endpoint
    const apiUrl = '/api/agent-query';
    
    try {
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
      
      // Make the API request with proper error handling
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          agentType: selectedAgent,
          stream: true
        }),
        signal: controller.signal
      }).catch(error => {
        console.error('Fetch error:', error);
        throw new Error(error.message || 'Failed to connect to the server');
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      // Check if we have the expected content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/event-stream')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }
      
      // Get the reader for the response body's stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader from response');
      }
      
      const decoder = new TextDecoder();
      let fullContent = '';
      
      const processStreamEvents = async () => {
        try {
          while (true) {
            // Add a timeout to the read operation to prevent hanging
            const readPromise = reader.read();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Read timeout')), 30000)); // 30 second timeout
            
            // Use Promise.race to implement timeout
            const { done, value } = await Promise.race([
              readPromise,
              timeoutPromise
            ]).catch(error => {
              console.error('Error reading from stream:', error);
              throw error; // Rethrow to be caught by outer try-catch
            }) as ReadableStreamReadResult<Uint8Array>;
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const events = chunk.split('\n\n').filter(e => e.trim());
            
            for (const eventText of events) {
              if (!eventText.includes('event:')) continue;
              
              const eventTypeMatch = eventText.match(/event: ([^\n]+)/);
              const dataMatch = eventText.match(/data: (.+)/);
              
              if (!eventTypeMatch || !dataMatch) continue;
              
              const eventType = eventTypeMatch[1];
              let data;
              
              try {
                data = JSON.parse(dataMatch[1]);
              } catch (parseError) {
                console.error('Error parsing event data:', parseError, dataMatch[1]);
                continue; // Skip this malformed event
              }
              
              // Handle different event types
              switch (eventType) {
                case 'start':
                  // Set metadata based on agent type
                  setMessages(prev => {
                    const msgIndex = prev.findIndex(m => m.id === assistantMessageId);
                    if (msgIndex === -1) return prev;
                    
                    const updatedMsgs = [...prev];
                    updatedMsgs[msgIndex] = {
                      ...updatedMsgs[msgIndex],
                      metadata: {
                        ...updatedMsgs[msgIndex].metadata,
                        // For 'auto' or 'triage', show triage in progress
                        triageInProgress: selectedAgent === 'auto' || selectedAgent === 'triage',
                        // For other agents, set appropriate flags based on agent type
                        researchInProgress: selectedAgent === 'research' || selectedAgent === 'orchestrator',
                        reportInProgress: selectedAgent === 'report'
                      }
                    };
                    return updatedMsgs;
                  });
                  break;
                  
                case 'triage':
                case 'triage_complete':
                  addAgentAction('triage', 'Query analysis complete', {
                    taskType: data.taskType,
                    confidence: data.confidence
                  });
                  
                  setMessages(prev => {
                    const msgIndex = prev.findIndex(m => m.id === assistantMessageId);
                    if (msgIndex === -1) return prev;
                    
                    const updatedMsgs = [...prev];
                    updatedMsgs[msgIndex] = {
                      ...updatedMsgs[msgIndex],
                      metadata: {
                        ...updatedMsgs[msgIndex].metadata,
                        triageInProgress: false,
                        triageComplete: true,
                        taskType: data.taskType,
                        triageConfidence: data.confidence,
                        triageReasoning: data.reasoning
                      }
                    };
                    return updatedMsgs;
                  });
                  break;
                  
                case 'heartbeat':
                  // Update last heartbeat time
                  lastHeartbeatTime = Date.now();
                  // Reset any existing timeout
                  if (heartbeatTimeoutId) {
                    clearTimeout(heartbeatTimeoutId);
                  }
                  // Set a new timeout to detect if heartbeats stop
                  heartbeatTimeoutId = setTimeout(() => {
                    console.error('Heartbeat timeout - connection may be lost');
                    // Throw an error to trigger the reconnection logic
                    throw new Error('message channel closed - heartbeat timeout');
                  }, HEARTBEAT_TIMEOUT);
                  break;
                  
                case 'token':
                  // Reset the heartbeat timeout whenever we receive a token
                  lastHeartbeatTime = Date.now();
                  fullContent += data.token;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const index = newMessages.findIndex(m => m.id === assistantMessageId);
                    if (index !== -1) {
                      newMessages[index].content = fullContent;
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'error':
                  addAgentAction('error', 'Error occurred', { message: data.message });
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const index = newMessages.findIndex(m => m.id === assistantMessageId);
                    if (index !== -1) {
                      newMessages[index].error = data.message;
                      newMessages[index].isStreaming = false;
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'research_start':
                  addAgentAction('research_start', 'Started web research');
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const index = newMessages.findIndex(m => m.id === assistantMessageId);
                    if (index !== -1) {
                      newMessages[index].metadata = {
                        ...newMessages[index].metadata,
                        researchInProgress: true
                      };
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'research_complete':
                  addAgentAction('research_complete', 'Research completed', {
                    sources: data.citations
                  });
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const index = newMessages.findIndex(m => m.id === assistantMessageId);
                    if (index !== -1) {
                      newMessages[index].metadata = {
                        ...newMessages[index].metadata,
                        researchInProgress: false,
                        researchComplete: true,
                        researchStats: {
                          sources: data.citations,
                          researchDataLength: data.researchDataLength
                        }
                      };
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'report_start':
                  addAgentAction('report_start', 'Generating report');
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const index = newMessages.findIndex(m => m.id === assistantMessageId);
                    if (index !== -1) {
                      newMessages[index].metadata = {
                        ...newMessages[index].metadata,
                        reportInProgress: true
                      };
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'complete':
                  addAgentAction('complete', 'Task completed');
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const index = newMessages.findIndex(m => m.id === assistantMessageId);
                    if (index !== -1) {
                      newMessages[index].content = data.content || fullContent;
                      newMessages[index].isStreaming = false;
                      newMessages[index].metadata = {
                        ...newMessages[index].metadata,
                        ...data.metadata,
                        reportInProgress: false
                      };
                    }
                    return newMessages;
                  });
                  setIsLoading(false);
                  break;
                  
                case 'trace':
                  if (data && data.spans) {
                    // Process trace spans and convert to agent actions
                    data.spans.forEach((span: any) => {
                      let actionType: AgentAction['type'] = 'custom';
                      let message = span.name || 'Unknown operation';
                      let metadata: Record<string, any> = {
                        startTime: new Date(span.started_at).getTime(),
                        endTime: span.ended_at ? new Date(span.ended_at).getTime() : undefined
                      };
                      
                      switch (span.span_type) {
                        case 'agent':
                          actionType = 'agent';
                          message = `Agent: ${span.span_data.agent_name || 'Unknown'}`;
                          metadata = {
                            ...metadata,
                            agentName: span.span_data.agent_name,
                            input: span.span_data.input?.substring(0, 50) + (span.span_data.input?.length > 50 ? '...' : '')
                          };
                          break;
                          
                        case 'generation':
                          actionType = 'generation';
                          message = `Model: ${span.span_data.model || 'Unknown'}`;
                          if (span.name.toLowerCase().includes('triage')) {
                            actionType = 'triage';
                            message = `Analyzing query with ${span.span_data.model}`;
                          } else if (span.name.toLowerCase().includes('research')) {
                            actionType = 'research_start';
                            message = `Researching with ${span.span_data.model}`;
                          } else if (span.name.toLowerCase().includes('report')) {
                            actionType = 'report_start';
                            message = `Generating report with ${span.span_data.model}`;
                          }
                          break;
                          
                        case 'function':
                          actionType = 'function';
                          message = `Function: ${span.span_data.function_name || 'Unknown'}`;
                          if (span.name.toLowerCase().includes('citation')) {
                            actionType = 'research_complete';
                            message = `Processed ${span.span_data.result || 0} citations`;
                            metadata.sources = span.span_data.result;
                          }
                          break;
                          
                        default:
                          actionType = 'custom';
                          message = `${span.span_type}: ${span.name}`;
                          break;
                      }
                      
                      addAgentAction(actionType, message, metadata);
                    });
                  }
                  break;
              }
            }
          }
        } catch (error) {
          console.error('Error in streaming process:', error);
          
          // Check if the error is related to message channel closed
          if (error instanceof Error && 
              error.message.includes('message channel closed')) {
            
            console.error('Message channel closed. Attempting to reconnect...');
            handleReconnect(assistantMessageId, queryText);
            return;
          }
          
          // Other errors handling
          setMessages(prev => {
            const newMessages = [...prev];
            const index = newMessages.findIndex(m => m.id === assistantMessageId);
            if (index !== -1) {
              newMessages[index].content = 'Sorry, an error occurred while processing your request.';
              newMessages[index].error = error instanceof Error ? error.message : 'Unknown error';
              newMessages[index].isStreaming = false;
            }
            return newMessages;
          });
          
          setIsLoading(false);
          // Reset reconnect counter on non-connection errors
          setReconnectAttempts(0);
          addAgentAction('error', 'Error in streaming process', { 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      };
      
      await processStreamEvents();
    } catch (error) {
      console.error('Error in streaming process:', error);
      
      // Check if the error is related to message channel closed
      if (error instanceof Error && 
          error.message.includes('message channel closed')) {
        
        console.error('Message channel closed. Attempting to reconnect...');
        handleReconnect(assistantMessageId, queryText);
        return;
      }
      
      // Other errors handling
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(m => m.id === assistantMessageId);
        if (index !== -1) {
          newMessages[index].content = 'Sorry, an error occurred while processing your request.';
          newMessages[index].error = error instanceof Error ? error.message : 'Unknown error';
          newMessages[index].isStreaming = false;
        }
        return newMessages;
      });
      
      setIsLoading(false);
      // Reset reconnect counter on non-connection errors
      setReconnectAttempts(0);
      addAgentAction('error', 'Error in streaming process', { 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStreamingSubmit(e);
    }
  };

  const getAgentDescription = () => {
    switch (selectedAgent) {
      case 'auto':
        return 'Automatically analyze your query and choose the best agent';
      case 'triage':
        return 'Analyze your query without generating a response';
      case 'research':
        return 'Search the web for current information';
      case 'report':
        return 'Format and analyze existing information';
      case 'orchestrator':
        return 'Research and generate a comprehensive report';
      default:
        return '';
    }
  };
  
  const clearConversation = () => {
    setMessages([]);
    setAgentActions([]);
    try {
      localStorage.removeItem('agent-messages');
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden">
      <div className="p-2 border-b flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleAgentMode}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Chat</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Agent:</span>
          <Select 
            value={selectedAgent} 
            onValueChange={(value) => setSelectedAgent(value as AgentType)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select agent type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center">
                  <span className="mr-2">🧠</span> Auto
                </div>
              </SelectItem>
              <SelectItem value="triage">
                <div className="flex items-center">
                  <span className="mr-2">🔍</span> Query Analysis
                </div>
              </SelectItem>
              <SelectItem value="research">
                <div className="flex items-center">
                  <Search className="mr-2 h-4 w-4" /> Research
                </div>
              </SelectItem>
              <SelectItem value="report">
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" /> Report
                </div>
              </SelectItem>
              <SelectItem value="orchestrator">
                <div className="flex items-center">
                  <span className="mr-2">🤖</span> Full Research Report
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {selectedAgent !== 'auto' && selectedAgent !== 'triage' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearConversation}
              className="text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {selectedAgent === 'auto' || selectedAgent === 'triage' ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Agent Mode</h1>
              <p className="text-muted-foreground max-w-md mb-4">
                {getAgentDescription()}
              </p>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setInput("What are the latest developments in AI?")}
                  >
                    Latest AI developments
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setInput("Write a report on climate change solutions")}
                  >
                    Climate change report
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setInput("Research and summarize recent space exploration achievements")}
                >
                  Space exploration summary
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map(message => (
              <AgentMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Agent action log */}
      {agentActions.length > 0 && (
        <div className="px-4 pb-2">
          <AgentActionLog actions={agentActions} />
        </div>
      )}
      
      <div className="p-4 border-t">
        <form onSubmit={handleStreamingSubmit} className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent for help..."
            className="min-h-12 resize-none"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
      
      <style jsx global>{`        .cursor {
          display: inline-block;
          width: 2px;
          opacity: 1;
        }
        .blink {
          animation: blink-animation 1s steps(2, start) infinite;
        }
        @keyframes blink-animation {
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
} 
