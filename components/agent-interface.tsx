'use client';

import { useState, useRef, useEffect } from 'react';
import { type Message } from 'ai';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateUUID } from '@/lib/utils';

// Simple message component for agent mode
function AgentMessage({ message }: { message: Message }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-foreground'
      }`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

export function AgentInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to state
    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // This would be replaced with your actual agent orchestration API call
      // For now, we'll simulate a response after a delay
      setTimeout(() => {
        const agentResponse: Message = {
          id: generateUUID(),
          role: 'assistant',
          content: `This is a simulated agent response to: "${input}"\n\nIn the full implementation, this would connect to your agent orchestration system.`,
        };
        setMessages(prev => [...prev, agentResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error calling agent:', error);
      setIsLoading(false);
      
      // Add error message
      const errorMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Agent Mode</h1>
              <p className="text-muted-foreground max-w-md">
                Interact with an AI agent that can help you accomplish tasks. The agent has access to tools 
                and can perform actions on your behalf.
              </p>
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
      
      <div className="border-t p-4 bg-background">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            tabIndex={0}
            placeholder="Send a message to the agent..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-12 resize-none"
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
} 