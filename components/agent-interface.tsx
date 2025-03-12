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

// Enhanced message interface with streaming metadata
interface EnhancedMessage extends Message {
  isStreaming?: boolean;
  error?: string;
  metadata?: {
    researchInProgress?: boolean;
    researchComplete?: boolean;
    researchStats?: {
      sources?: number;
      researchDataLength?: number;
    };
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

type AgentType = 'research' | 'report' | 'orchestrator';

export function AgentInterface() {
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('orchestrator');
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
    };
  }, []);

  const handleStreamingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Add user message to state
    const userMessage: EnhancedMessage = {
      id: generateUUID(),
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Create a placeholder for the assistant's response
    const assistantMessageId = generateUUID();
    const placeholderMessage: EnhancedMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    
    setMessages(prev => [...prev, placeholderMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Make the API request with streaming enabled
      const response = await fetch('/api/agent-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: input,
          agentType: selectedAgent,
          stream: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get a response');
      }
      
      // Create a new reader to handle the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const decoder = new TextDecoder();
      let fullContent = '';
      
      const processStreamEvents = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split('\n\n').filter(e => e.trim());
          
          for (const eventText of events) {
            if (!eventText.includes('event:')) continue;
            
            const eventTypeMatch = eventText.match(/event: ([^\n]+)/);
            const dataMatch = eventText.match(/data: (.+)/);
            
            if (!eventTypeMatch || !dataMatch) continue;
            
            const eventType = eventTypeMatch[1];
            const data = JSON.parse(dataMatch[1]);
            
            // Handle different event types
            switch (eventType) {
              case 'token':
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
                setMessages(prev => {
                  const newMessages = [...prev];
                  const index = newMessages.findIndex(m => m.id === assistantMessageId);
                  if (index !== -1) {
                    newMessages[index].metadata = {
                      ...newMessages[index].metadata,
                      researchInProgress: false,
                      researchComplete: true,
                      researchStats: {
                        sources: data.sources,
                        researchDataLength: data.researchDataLength
                      }
                    };
                  }
                  return newMessages;
                });
                break;
                
              case 'report_start':
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
            }
          }
        }
      };
      
      await processStreamEvents();
    } catch (error) {
      console.error('Error in streaming process:', error);
      
      // Update the message with the error
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
    } finally {
      setIsLoading(false);
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
      case 'research':
        return 'Research Agent searches the web for current information and provides detailed answers with citations.';
      case 'report':
        return 'Report Agent generates well-structured reports in Markdown format based on your input.';
      case 'orchestrator':
        return 'Orchestrator combines research and report generation to create comprehensive reports on any topic.';
      default:
        return '';
    }
  };
  
  const clearConversation = () => {
    setMessages([]);
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="research">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>Research Agent</span>
                </div>
              </SelectItem>
              <SelectItem value="report">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Report Agent</span>
                </div>
              </SelectItem>
              <SelectItem value="orchestrator">
                <div className="flex items-center gap-2">
                  <span>🔄</span>
                  <span>Orchestrator</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {messages.length > 0 && (
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
        {messages.length === 0 ? (
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
      
      <style jsx global>{`
        .cursor {
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