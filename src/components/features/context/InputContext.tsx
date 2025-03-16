import { createContext, useContext, ReactNode } from 'react';
import type { ExtendedAttachment } from '@/types';
import type { Message, ChatRequestOptions, CreateMessage } from 'ai';
import { Dispatch, SetStateAction } from 'react';

interface InputContextType {
  // Basic input controls
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  
  // Chat state
  chatId: string;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  
  // File handling
  attachments: Array<ExtendedAttachment>;
  setAttachments: Dispatch<SetStateAction<Array<ExtendedAttachment>>>;
  
  // Submission handlers
  stop: () => void;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  
  // Configuration
  selectedWorkflowId?: string | null;
}

export const InputContext = createContext<InputContextType | null>(null);

export function InputProvider({ 
  children,
  value
}: { 
  children: ReactNode;
  value: InputContextType;
}) {
  return (
    <InputContext.Provider value={value}>
      {children}
    </InputContext.Provider>
  );
}

export function useInputContext() {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error('useInputContext must be used within an InputProvider');
  }
  return context;
} 