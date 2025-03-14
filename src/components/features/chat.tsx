'use client';

import type { Message } from 'ai';
import type { ChatRequestOptions } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';

import { ChatHeader } from '@/src/components/layout';
import type { Vote } from '@/lib/db/schema';
import { fetcher } from '@/utils';
import { generateUUID } from '@/utils/auth';
import type { ExtendedAttachment } from '@/types';
import { 
  showUniqueErrorToast, 
  resetErrorTracking, 
  logError as logApiError 
} from '@/lib/api-error-handler';

import { Artifact } from '@/src/components/features/artifact';
import { Messages } from './messages';
import { MultimodalInput } from '@/src/components/features';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import dynamic from 'next/dynamic';

// Add type declaration for window.generateRandomStars
declare global {
  interface Window {
    generateRandomStars?: () => HTMLElement;
  }
}

// Agent mode functionality is now integrated directly into the MultimodalInput component

// Add this interface to help type the error messages from the API
interface StreamErrorMessage {
  type: 'error';
  error: string;
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [usesFallbackModel, setUsesFallbackModel] = useState(false);
  const [chatId, setChatId] = useState<string>(id);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { user } = useAuth();
  
  const [hasError, setHasError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showWelcome, setShowWelcome] = useState(id === 'create-new');
  
  // Add animation and UI state
  const [showSparkles, setShowSparkles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle network status and display
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Network connection lost');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clear error state when chat ID changes
  useEffect(() => {
    setHasError(false);
    setIsFirstLoad(true);
    
    if (id === 'create-new') {
      setShowWelcome(true);
    } else {
      setShowWelcome(initialMessages.length === 0);
    }
    
    return () => {
      setHasError(false);
    };
  }, [id, initialMessages.length]);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Show sparkle animation on first message from AI
    if (isFirstLoad && initialMessages.length > 0) {
      setIsFirstLoad(false);
      
      // Briefly show sparkles animation
      setTimeout(() => {
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 1500);
      }, 500);
    }
  }, [initialMessages, isFirstLoad]);

  // Handle new chat creation
  useEffect(() => {
    async function createNewChat() {
      if (id === 'create-new' && user) {
        try {
          setIsCreatingChat(true);
          const newId = generateUUID();
          // Create a new chat in the database
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: newId,
              title: 'New Chat',
              visibility: selectedVisibilityType,
            }),
          });
          
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to create chat');
          }
          
          if (data.id) {
            setChatId(data.id);
            // Update the URL without refreshing the page
            window.history.replaceState({}, '', `/chat/${data.id}`);
          } else {
            throw new Error('No chat ID returned from server');
          }
        } catch (error) {
          logApiError(error, 'Failed to create new chat');
          if (!hasError) {
            toast.error(error instanceof Error ? error.message : 'Failed to create new chat. Please try again.');
            setHasError(true);
          }
        } finally {
          setIsCreatingChat(false);
        }
      }
    }

    createNewChat();
  }, [id, user, selectedVisibilityType, hasError]);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id: chatId,
    body: { id: chatId, selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onResponse(response) {
      // Check for HTTP errors
      if (!response.ok) {
        const status = response.status;
        console.error(`[CHAT] HTTP Error (${status}): ${response.statusText}`);
        
        // Basic error handling
        toast.error(`API error: ${response.statusText || 'Request failed'}`);
        setHasError(true);
      } else {
        // Reset error state on successful response
        setHasError(false);
        setShowWelcome(false);
        
        // Show brief sparkle animation on new response
        setTimeout(() => {
          setShowSparkles(true);
          setTimeout(() => setShowSparkles(false), 1500);
        }, 300);
      }
    },
    onFinish: (message) => {
      console.log(`[CHAT] Chat completed successfully with model: ${selectedChatModel}`);
      setHasError(false);
      
      if (message.content.includes('fallback model')) {
        console.log('[CHAT] Using fallback model detected');
        setUsesFallbackModel(true);
        toast.warning(`The ${selectedChatModel} model is currently unavailable. Using a fallback model instead.`);
      }
      
      // Refresh chat history
      mutate('/api/history');
      
      // Scroll to bottom of chat
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    },
    onError: (error) => {
      console.error(`[CHAT] Error with model ${selectedChatModel}:`, error);
      
      // Simple error handling
      toast.error('An error occurred while processing your message. Please try again.');
      setHasError(true);
    },
  });
  
  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${chatId}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<ExtendedAttachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Function to generate random stars for chat background
  const generateRandomStars = () => {
    if (typeof window === 'undefined') return;
    
    // Use the globally accessible function if it exists
    if (window.generateRandomStars && typeof window.generateRandomStars === 'function') {
      return (window.generateRandomStars as () => HTMLElement)();
    }
    
    return null;
  };

  // Handle custom form submission with animation
  const customHandleSubmit = (
    event?: { preventDefault?: () => void } | undefined,
    chatRequestOptions?: ChatRequestOptions
  ) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    
    // If user is offline, show a toast
    if (!isOnline) {
      toast.error('You are currently offline. Please reconnect to use the chat.');
      return;
    }
    
    // Add subtle animation when sending a message
    if (chatContainerRef.current) {
      chatContainerRef.current.classList.add('chat-sending-pulse');
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.classList.remove('chat-sending-pulse');
        }
      }, 300);
    }
    
    handleSubmit(event, chatRequestOptions);
  };

  return (
    <div 
      className="relative flex flex-col w-full h-full overflow-hidden"
      ref={chatContainerRef}
    >
      {/* Network Status Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-destructive/80 text-destructive-foreground text-center py-1 px-4 z-50"
          >
            <span className="text-sm">You are currently offline. Reconnect to continue chatting.</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sparkles Animation */}
      <AnimatePresence>
        {showSparkles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <div className="sparkles-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="sparkle"
                  initial={{ 
                    opacity: 0,
                    scale: 0,
                    x: Math.random() * 100 - 50,
                    y: Math.random() * 100 - 50,
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100,
                  }}
                  transition={{
                    duration: 1 + Math.random() * 0.5,
                    delay: Math.random() * 0.5,
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: `hsl(${Math.random() * 360}, 100%, 70%)`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Chat Header */}
      <ChatHeader 
        chatId={chatId}
        selectedModelId={selectedChatModel}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
      />
      
      {/* Main Chat Content */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4 px-4 relative">
        {/* Show a welcome message if this is a new chat */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 p-6 rounded-lg bg-primary/5 max-w-3xl mx-auto text-center"
          >
            <h1 className="text-2xl font-bold mb-3">Welcome to HighQ</h1>
            <p className="text-muted-foreground mb-4">
              The Highest Quality, Highest IQ AI system on earth. Start by asking me anything!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 text-left">
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left"
                onClick={() => setInput("What can you help me with?")}
              >
                <span className="text-sm font-medium">What can you help me with?</span>
              </button>
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left"
                onClick={() => setInput("Create a short story about a space explorer.")}
              >
                <span className="text-sm font-medium">Generate a creative story</span>
              </button>
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left"
                onClick={() => setInput("Explain the concept of quantum computing in simple terms.")}
              >
                <span className="text-sm font-medium">Explain a complex topic</span>
              </button>
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left"
                onClick={() => setInput("Help me debug this code snippet: function sum(a, b) { retur a + b; }")}
              >
                <span className="text-sm font-medium">Debug some code</span>
              </button>
            </div>
          </motion.div>
        )}
      
        {/* Chat Messages */}
        <Messages
          messages={messages}
          isLoading={isLoading}
          chatId={chatId}
          votes={votes ?? []}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />
        
        {/* Visible when artifacts are open */}
        {isArtifactVisible && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center overflow-auto">
            <Artifact 
              attachments={attachments}
              /* Passing minimal required props to avoid TypeScript errors */
            />
          </div>
        )}
        
        {/* Error Message */}
        {hasError && (
          <div className="p-4 mb-4 bg-destructive/10 border border-destructive rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-destructive">An error occurred. Please try again or refresh the page.</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => reload()}
                className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 text-xs rounded-md bg-secondary text-secondary-foreground"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}
        
        {/* Used to scroll to bottom of messages */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          <MultimodalInput
            chatId={chatId}
            input={input}
            setInput={setInput}
            isLoading={isLoading || isCreatingChat}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
            handleSubmit={customHandleSubmit}
            className="relative z-10 border border-border bg-background shadow-lg rounded-lg"
          />
          
          {/* Model info at the bottom */}
          {usesFallbackModel ? (
            <div className="text-center mt-2 text-xs text-amber-500">
              Using fallback model • {selectedChatModel} unavailable
            </div>
          ) : (
            <div className="text-center mt-2 text-xs text-muted-foreground">
              {isOnline ? `Using ${selectedChatModel} • ${selectedVisibilityType}` : "Offline Mode"}
            </div>
          )}
        </div>
      </div>
      
      {/* Add CSS for animations */}
      <style jsx>{`
        .chat-sending-pulse {
          animation: pulse 0.3s ease-in-out;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.995); }
          100% { transform: scale(1); }
        }
        
        .sparkles-container {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        
        .sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
