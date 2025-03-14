'use client';

import type { Message } from 'ai';
import type { ChatRequestOptions } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import type { ExtendedAttachment } from '@/types';
import { 
  showUniqueErrorToast, 
  resetErrorTracking, 
  logError as logApiError 
} from '@/lib/api-error-handler';

import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import dynamic from 'next/dynamic';

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
  const [hasShownError, setHasShownError] = useState(false);
  const [apiErrorCount, setApiErrorCount] = useState(0); // Track consecutive API errors
  const [isOnline, setIsOnline] = useState(true);
  const lastErrorRef = useRef<string>(''); // Track last error message to avoid duplicates
  const errorToastIdRef = useRef<string | number | null>(null); // Track toast ID to avoid dupes
  
  // Reset error state when chat ID changes or component unmounts
  useEffect(() => {
    setHasShownError(false);
    setApiErrorCount(0);
    resetErrorTracking(); // Use centralized error tracking reset
    lastErrorRef.current = '';
    
    // Clear any existing error toasts when changing chats
    if (errorToastIdRef.current) {
      toast.dismiss(errorToastIdRef.current);
      errorToastIdRef.current = null;
    }
    
    return () => {
      setHasShownError(false);
      setApiErrorCount(0);
      resetErrorTracking(); // Use centralized error tracking reset
      lastErrorRef.current = '';
      
      // Clear any existing error toasts on unmount
      if (errorToastIdRef.current) {
        toast.dismiss(errorToastIdRef.current);
        errorToastIdRef.current = null;
      }
    };
  }, [id]);

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
          if (!hasShownError) {
            toast.error(error instanceof Error ? error.message : 'Failed to create new chat. Please try again.');
            setHasShownError(true);
          }
        } finally {
          setIsCreatingChat(false);
        }
      }
    }

    createNewChat();
  }, [id, user, selectedVisibilityType, hasShownError]);

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
        
        // Use the error handler with appropriate error context
        const error = new Error(`HTTP ${status}: ${response.statusText || 'Request failed'}`);
        showUniqueErrorToast(error);
      }
    },
    onFinish: (message) => {
      console.log(`[CHAT] Chat completed successfully with model: ${selectedChatModel}`);
      setApiErrorCount(0); // Reset error count on successful completion
      
      if (message.content.includes('fallback model')) {
        console.log('[CHAT] Using fallback model detected');
        setUsesFallbackModel(true);
        if (!hasShownError) {
          toast.warning(`The ${selectedChatModel} model is currently unavailable. Using a fallback model instead.`);
          setHasShownError(true);
        }
      }
      
      mutate('/api/history');
    },
    onError: (error) => {
      logApiError(error, `Chat error with model ${selectedChatModel}`);
      
      // Track consecutive errors
      setApiErrorCount(prev => prev + 1);
      
      // If we've had multiple consecutive errors, add that context
      if (apiErrorCount >= 2) {
        console.error('[CHAT] Multiple consecutive errors:', apiErrorCount, error);
        showUniqueErrorToast(
          new Error('Multiple errors encountered. The service may be experiencing issues.')
        );
      } else if (!error.message?.includes('create-new')) {
        // Only show errors that aren't related to chat creation
        showUniqueErrorToast(error);
      }
    },
  });
  
  // Function to show error toast only if it's different from the last one
  const showUniqueErrorToast = useCallback((message: string) => {
    // Don't show duplicate errors in succession
    if (message === lastErrorRef.current) {
      return;
    }
    
    // Update last error message
    lastErrorRef.current = message;
    
    // Dismiss any existing error toast
    if (errorToastIdRef.current) {
      toast.dismiss(errorToastIdRef.current);
    }
    
    // Show new error toast and store its ID
    errorToastIdRef.current = toast.error(message, {
      duration: 5000,
      onDismiss: () => {
        errorToastIdRef.current = null;
      }
    });
    
    setHasShownError(true);
  }, []);

  // Reset error state when the error is resolved
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setHasShownError(false);
    }
  }, [isLoading, messages.length]);

  // Handle errors from the API using the new error format
  useEffect(() => {
    // Custom message handler to process data events from the stream
    const processStreamMessages = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle explicit error messages with the new format
        if (data.type === 'error' && data.error) {
          console.error('[CHAT] Stream error:', data.error);
          showUniqueErrorToast(new Error(data.error));
          return;
        }
      } catch (error) {
        // Ignore parsing errors for non-error messages
        // This is normal for streaming chunks
      }
    };

    // Add event listener for SSE messages
    window.addEventListener('message', processStreamMessages);
    return () => window.removeEventListener('message', processStreamMessages);
  }, []);

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${chatId}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<ExtendedAttachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Initialize animation variables when component mounts
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--animation-play-state', 'running');
    root.style.setProperty('--animation-opacity', '1');
    root.style.setProperty('--nebula-opacity', '0.9');
    root.style.setProperty('--stars-opacity', '0.9');
    root.style.setProperty('--shooting-stars-display', 'block');
    root.style.setProperty('--body-before-opacity', '1');
    root.style.setProperty('--body-after-opacity', '1');
    
    // Generate random stars directly in the component
    generateRandomStars();
    
    // Make the function globally accessible for the animation toggle
    // @ts-ignore - Adding to window
    window.generateRandomStars = generateRandomStars;
    
    // Cleanup function
    return () => {
      // @ts-ignore - Remove from window
      window.generateRandomStars = undefined;
    };
  }, []);
  
  // Function to generate random stars
  const generateRandomStars = () => {
    // Clear any existing random stars first
    const existingStars = document.querySelector('.cosmic-animation-container .random-stars');
    if (existingStars) {
      existingStars.innerHTML = '';
    }
    
    // Generate a unique seed for this session
    let sessionSeed = Math.floor(Math.random() * 1000000);
    console.log('Generating random stars with seed:', sessionSeed);
    
    // Simple random function with seed
    function seededRandom() {
      const x = Math.sin(sessionSeed++) * 10000;
      return x - Math.floor(x);
    }
    
    // Get the random stars container
    const randomStarsContainer = document.querySelector('.cosmic-animation-container .random-stars');
    if (!randomStarsContainer) {
      console.error('Random stars container not found');
      return;
    }
    
    // Dense cluster region (40-60 stars) - reduced from 50-80
    const clusterStarCount = 40 + Math.floor(seededRandom() * 20);
    const clusterCenterX = 20 + seededRandom() * 60; // 20-80% of screen width
    const clusterCenterY = 20 + seededRandom() * 60; // 20-80% of screen height
    
    for (let i = 0; i < clusterStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star';
      
      // Position within cluster (less concentrated distribution)
      const angle = seededRandom() * Math.PI * 2;
      // Increased spread from 30 to 45 to make clusters less dense
      const distance = seededRandom() * 45; 
      const top = clusterCenterY + Math.sin(angle) * distance;
      const left = clusterCenterX + Math.cos(angle) * distance;
      
      // Random size (0.5px - 3px)
      const size = 0.5 + seededRandom() * 2.5;
      
      // Random brightness
      const brightness = 0.5 + seededRandom() * 0.5;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      const duration = 3 + seededRandom() * 4;
      
      // Apply styles
      star.style.top = `${top}%`;
      star.style.left = `${left}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.opacity = brightness.toString();
      star.style.animationDelay = `${delay}s`;
      star.style.animationDuration = `${duration}s`;
      
      randomStarsContainer.appendChild(star);
    }
    
    // Scattered stars throughout (50-70 stars) - increased from 40-60
    const scatteredStarCount = 50 + Math.floor(seededRandom() * 20);
    
    for (let i = 0; i < scatteredStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Random size (0.5px - 2px)
      const size = 0.5 + seededRandom() * 1.5;
      
      // Random brightness
      const brightness = 0.4 + seededRandom() * 0.6;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      const duration = 3 + seededRandom() * 4;
      
      // Apply styles
      star.style.top = `${top}%`;
      star.style.left = `${left}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.opacity = brightness.toString();
      star.style.animationDelay = `${delay}s`;
      star.style.animationDuration = `${duration}s`;
      
      randomStarsContainer.appendChild(star);
    }
    
    // Bright highlight stars (5-8 stars) - reduced from 10-15
    const brightStarCount = 5 + Math.floor(seededRandom() * 3);
    
    for (let i = 0; i < brightStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star bright';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Larger size (2px - 4px)
      const size = 2 + seededRandom() * 2;
      
      // High brightness
      const brightness = 0.8 + seededRandom() * 0.2;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      const duration = 4 + seededRandom() * 3;
      
      // Apply styles
      star.style.top = `${top}%`;
      star.style.left = `${left}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.opacity = brightness.toString();
      star.style.animationDelay = `${delay}s`;
      star.style.animationDuration = `${duration}s`;
      star.style.boxShadow = `0 0 ${Math.floor(size)}px ${Math.floor(size/2)}px rgba(255, 255, 255, 0.6)`;
      
      randomStarsContainer.appendChild(star);
    }
    
    console.log(`Generated ${clusterStarCount + scatteredStarCount + brightStarCount} random stars`);
  };

  // Network connectivity monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[Chat] Network connection restored');
      toast.success('Network connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[Chat] Network connection lost');
      toast.error('Network connection lost. Messages may not be sent until connection is restored.');
    };
    
    // Listen for network status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to handle form submission with logging and improved error handling
  const handleSubmitWithLogging = useCallback(
    async (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions
    ) => {
      console.log(`[CHAT] Submitting chat with model: ${selectedChatModel}`);
      
      // Clear any existing error state on new submission
      setHasShownError(false);
      resetErrorTracking();
      setApiErrorCount(0);
      
      // Check for network connectivity
      if (!navigator.onLine) {
        showUniqueErrorToast(
          new Error('You are offline. Please check your internet connection and try again.')
        );
        return;
      }
      
      // Don't submit if there's no input and no attachments
      if (chatRequestOptions?.data && 
          typeof chatRequestOptions.data === 'object' &&
          'input' in chatRequestOptions.data &&
          !chatRequestOptions.data.input && 
          (!chatRequestOptions?.experimental_attachments || 
           chatRequestOptions.experimental_attachments.length === 0)) {
        console.log('[CHAT] Prevented empty submission');
        return;
      }
      
      try {
        await handleSubmit(event, chatRequestOptions);
      } catch (error) {
        logApiError(error, 'Error submitting message');
        if (!hasShownError) {
          showUniqueErrorToast(error);
        }
      }
    },
    [handleSubmit, selectedChatModel, hasShownError]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {isCreatingChat ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
            <p className="text-sm text-muted-foreground">Creating new chat...</p>
          </div>
        </div>
      ) : (
        <>
          <ChatHeader
            chatId={chatId}
            selectedModelId={selectedChatModel}
            selectedVisibilityType={selectedVisibilityType}
            isReadonly={isReadonly}
          />
          <Messages
            messages={messages}
            isLoading={isLoading}
            chatId={chatId}
            isReadonly={isReadonly}
            votes={votes || []}
            setMessages={setMessages}
            reload={reload}
            isArtifactVisible={isArtifactVisible}
          />
          <MultimodalInput
            chatId={chatId}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmitWithLogging}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        </>
      )}
    </div>
  );
}
