'use client';

import React from 'react';
import { useInputContext } from './InputContext';
import { TextareaInput } from './TextareaInput';
import { AttachButton } from './AttachButton';
import { SendButton } from './SendButton';

/**
 * MessageForm component for handling message submission
 */
export function MessageForm() {
  const { 
    isLoading,
    handleSubmit
  } = useInputContext();
  
  // Use empty array as default for uploadQueue
  const uploadQueue: string[] = [];
  
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
  };
  
  return (
    <form 
      onSubmit={onSubmit}
      className="flex items-center gap-2 w-full"
    >
      <div className="flex-1 relative">
        <TextareaInput />
      </div>
      
      <div className="flex items-center gap-2">
        <AttachButton 
          onClick={() => document.getElementById('file-upload')?.click()} 
          disabled={isLoading} 
        />
        <SendButton 
          uploadQueue={uploadQueue} 
          isLoading={isLoading} 
          onStopGeneration={() => {}} 
        />
      </div>
    </form>
  );
} 