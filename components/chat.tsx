'use client';

import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { motion } from 'framer-motion';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import type { ExtendedAttachment } from '@/types';

import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Agent mode functionality is now integrated directly into the MultimodalInput component

// Add detailed logging function
const logError = (error: any, context: string) => {
  console.error(`[ERROR] ${context}:`, error);
  console.error(`Error type: ${typeof error}`);
  console.error(`Error message: ${error.message}`);
  console.error(`Error stack: ${error.stack}`);
  
  if (error.response) {
    console.error(`Response status: ${error.response.status}`);
    console.error(`Response data:`, error.response.data);
  }
  
  if (error.cause) {
    console.error(`Error cause: ${error.cause}`);
  }
  
  // Handle message channel errors
  if (error.message && error.message.includes('message channel closed')) {
    console.error('Message channel closed prematurely. This could be due to:');
    console.error('1. Network instability');
    console.error('2. Server timeout');
    console.error('3. Client navigation away from page');
  }
};

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
  
  console.log(`Initializing chat with model: ${selectedChatModel}`);

  // Log when the component mounts or when the selected model changes
  useEffect(() => {
    console.log(`[CHAT] Component mounted or model changed: ${selectedChatModel}`);
    
    // Reset fallback model state when model changes
    setUsesFallbackModel(false);
    
    // Add specific error handling for message channel errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          event.reason.message.includes('message channel closed')) {
        console.error('[CHAT] Message channel closed prematurely:', event.reason);
        event.preventDefault(); // Prevent the default error handling
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [selectedChatModel]);

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
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: (message) => {
      console.log(`[CHAT] Chat completed successfully with model: ${selectedChatModel}`);
      
      // Check if the response contains information about a fallback model
      if (message.content.includes('fallback model')) {
        console.log('[CHAT] Using fallback model detected');
        setUsesFallbackModel(true);
        toast.warning(`The ${selectedChatModel} model is currently unavailable. Using a fallback model instead.`);
      }
      
      mutate('/api/history');
    },
    onError: (error) => {
      logError(error, `Chat error with model ${selectedChatModel}`);
      
      // Log additional details about the error
      console.error(`[CHAT] Error details for model ${selectedChatModel}:`);
      
      // Type assertion for API error objects that might have response/request properties
      const apiError = error as Error & { 
        response?: { status: number; data: any }; 
        request?: any;
      };
      
      if (apiError.response) {
        console.error(`Response status: ${apiError.response.status}`);
        console.error(`Response data:`, apiError.response.data);
      }
      
      if (apiError.request) {
        console.error(`Request details:`, apiError.request);
      }
      
      // Provide more specific error messages based on the error
      if (error.message && error.message.includes('model')) {
        console.error(`[CHAT] Model-specific error detected: ${error.message}`);
        toast.error(`Model error: The selected model (${selectedChatModel}) may not be available. Please try a different model.`);
      } else if (error.message && error.message.includes('context length')) {
        toast.error('The conversation is too long for the model. Please start a new chat.');
      } else if (error.message && error.message.includes('rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment before trying again.');
      } else {
        toast.error(`An error occurred: ${error.message || 'Unknown error'}`);
      }
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
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

  // Function to handle form submission with logging
  const handleSubmitWithLogging = (
    event?: { preventDefault?: () => void } | undefined,
    chatRequestOptions?: any
  ) => {
    console.log(`[CHAT] Submitting chat with model: ${selectedChatModel}`);
    
    try {
      return handleSubmit(event, chatRequestOptions);
    } catch (error) {
      logError(error, 'Error submitting message');
      return Promise.resolve();
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ChatHeader
          id={id}
          title={title}
          selectedChatModel={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          numberOfMessages={messages.length - numberOfSystemMessages}
          handleStartNewChat={handleStartNewChat}
          isReadonly={isReadonly}
        />

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-3xl flex flex-col min-h-full">
            <Messages
              messages={messages}
              isLoading={isLoading}
              error={error}
              chatId={id}
              votes={votes}
              reload={reload}
              isReadonly={isReadonly}
            />
          </div>
        </div>

        <motion.div
          className="relative mx-auto px-4 pb-4 md:pb-6 w-full max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 -z-10 pointer-events-none" />
          
          <div className="flex gap-2 w-full">
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
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
            )}
          </div>
        </motion.div>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmitWithLogging}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
