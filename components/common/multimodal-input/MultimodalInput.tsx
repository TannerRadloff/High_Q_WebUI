'use client';

import type {
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { cn } from '@/utils/formatting';
import { showUniqueErrorToast } from '@/lib/api-error-handler';
import { ArrowUpIcon, PaperclipIcon, StopIcon, CrossIcon } from '@/src/components/common/icons';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { sanitizeUIMessages } from '@/utils/messages';
import { ExtendedAttachment } from '@/types';
import { useFileUpload } from './hooks/useFileUpload';
import { InputProvider, useInputContext } from './InputContext';
import { notifications } from '@/lib/api-error-handler';

// Main exported component that uses the context provider
export function MultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  selectedWorkflowId,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<ExtendedAttachment>;
  setAttachments: Dispatch<SetStateAction<Array<ExtendedAttachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
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
  className?: string;
  selectedWorkflowId?: string | null;
}) {
  // Track direct chat mode preference
  const [isDirectChatMode, setIsDirectChatMode] = useLocalStorage<boolean>('direct-chat-mode', false);
  
  // Show toast when changing modes
  useEffect(() => {
    if (isDirectChatMode) {
      toast.info('Direct chat mode enabled', {
        description: 'Your messages will go directly to the AI assistant',
        duration: 3000,
      });
    } else {
      toast.info('Agent delegation mode enabled', {
        description: 'The delegation agent will route your request to the most appropriate specialized agent',
        duration: 3000,
      });
    }
  }, [isDirectChatMode]);
  
  return (
    <div className={cn("relative", className)}>
      <InputProvider
        value={{
          input,
          setInput,
          isLoading,
          chatId,
          messages,
          setMessages,
          attachments,
          setAttachments,
          stop,
          append,
          handleSubmit,
          selectedWorkflowId,
          isDirectChatMode,
          setIsDirectChatMode,
        }}
      >
        <InputContainer className="enhanced-input" />
      </InputProvider>
    </div>
  );
}

// Main component that uses the context
function InputContainer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-1.5 mt-auto bg-background/60 backdrop-blur-md backdrop-saturate-150 rounded-xl border sm:border border-border',
        'relative lg:py-3 lg:px-3.5 w-full',
        'shadow-lg hover:shadow-xl transition-all duration-200',
        'enhanced-input',
        className
      )}
    >
      <MessageForm />
    </div>
  );
}

// MessageForm component
function MessageForm() {
  const { 
    input,
    isLoading,
    stop,
    attachments, 
    setAttachments,
    setMessages,
    isDirectChatMode,
    setIsDirectChatMode
  } = useInputContext();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMessage = useSubmitMessage();
  
  // Setup file upload handling
  const { uploadQueue, handleFileChange } = useFileUpload(setAttachments);
  
  // Function to handle attachment actions
  const handleAttachment = (action: 'remove', index: number) => {
    if (action === 'remove') {
      setAttachments(attachments.filter((_, i) => i !== index));
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) {
      // If loading, stop generation when form is submitted
      handleStopGeneration();
    } else {
      // Otherwise submit the message
      submitMessage(e);
    }
  };
  
  // Function to handle stopping generation
  const handleStopGeneration = () => {
    // Call the stop function to stop generation
    stop();
    
    // Sanitize the UI messages to clean up streaming state
    setMessages((messages) => sanitizeUIMessages(messages));
    
    // Notify that generation was stopped by user
    notifications.info('Generation stopped by user', { 
      id: 'generation-stopped',
      duration: 3000
    });
  };
  
  // Add keyboard shortcut to stop generation (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLoading && event.key === "Escape") {
        handleStopGeneration();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, stop, setMessages]);
  
  // Toggle between delegation agent and direct chat modes
  const handleToggleMode = () => {
    if (setIsDirectChatMode) {
      // Toggle the mode - the useEffect for this state change will handle showing the toast
      setIsDirectChatMode(!isDirectChatMode);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col">
      {/* Attachments area */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-2 mb-2 overflow-hidden"
          >
            {attachments.map((attachment, i) => (
              <AttachmentItem 
                key={`${attachment.name}-${i}`}
                attachment={attachment} 
                onRemove={() => handleAttachment('remove', i)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Direct chat mode toggle */}
      {setIsDirectChatMode && (
        <div className="flex items-center justify-end mb-2 text-xs">
          <div className="flex items-center space-x-2">
            <Switch
              id="direct-chat-mode"
              checked={isDirectChatMode}
              onCheckedChange={handleToggleMode}
              className="data-[state=checked]:bg-sky-600"
            />
            <Label htmlFor="direct-chat-mode" className="cursor-pointer">
              {isDirectChatMode ? 'Direct Chat' : 'Delegation Agent'}
            </Label>
          </div>
        </div>
      )}
      
      {/* Main input area */}
      <div className="flex items-end w-full gap-2">
        <div className="flex-1">
          <TextareaInput />
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Attachments button */}
          <AttachButton 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isLoading}
          />
          
          {/* Send/Stop button */}
          <SendButton 
            uploadQueue={uploadQueue}
            isLoading={isLoading} 
            onStopGeneration={stop}
          />
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
        </div>
      </div>
    </form>
  );
}

// Textarea input component
function TextareaInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { 
    input, 
    setInput, 
    isLoading,
    attachments
  } = useInputContext();
  
  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to avoid issues with shrinking
    textarea.style.height = 'auto';
    
    // Set the height based on scrollHeight (content height)
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, 24), // Min height of 24px
      200 // Max height of 200px
    );
    textarea.style.height = `${newHeight}px`;
  }, [input]);
  
  // Handle text input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  
  // Handle keyboard shortcuts (e.g., Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for Enter without Shift (new line) or Ctrl/Cmd (formatting)
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      
      // Trigger submit on parent form
      const form = textareaRef.current?.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };
  
  // Generate placeholder based on state
  const getPlaceholder = () => {
    if (isLoading) return "AI is generating...";
    if (attachments.length > 0) return "Add a message or send attachments";
    return "Ask me anything...";
  };
  
  return (
    <Textarea
      ref={textareaRef}
      name="message"
      className={cn(
        "min-h-[24px] w-full resize-none border-0 bg-transparent px-3 py-2 focus-visible:ring-0",
        "placeholder:text-muted-foreground text-base sm:text-sm",
        "disabled:opacity-50"
      )}
      placeholder={getPlaceholder()}
      value={isLoading ? "AI is generating..." : input}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={isLoading}
      rows={1}
      data-gramm="false" // Disable Grammarly
      spellCheck={!isLoading}
    />
  );
}

// Send/Stop button
function SendButton({ 
  uploadQueue,
  isLoading,
  onStopGeneration
}: { 
  uploadQueue: string[];
  isLoading: boolean;
  onStopGeneration: () => void;
}) {
  const { input, attachments } = useInputContext();
  const hasContent = input.trim().length > 0 || attachments.length > 0;
  const [isStopping, setIsStopping] = useState(false);
  
  // Handle click based on state
  const handleClick = () => {
    if (isLoading) {
      setIsStopping(true);
      onStopGeneration();
      
      // Add a short timeout to show "Stopping..." state
      setTimeout(() => {
        setIsStopping(false);
      }, 1500);
    }
  };
  
  return (
    <ButtonTooltip content={isLoading ? (isStopping ? "Stopping generation..." : "Stop generating") : "Send message"}>
      <Button
        size="icon"
        type={isLoading ? "button" : "submit"}
        onClick={isLoading ? handleClick : undefined}
        disabled={(!isLoading && !hasContent) || isStopping}
        variant={isLoading ? "destructive" : "default"}
        data-state={isLoading ? "stop" : "send"}
        aria-label={isLoading ? (isStopping ? "Stopping generation" : "Stop generating") : "Send message"}
        className={cn(
          "rounded-full w-8 h-8 shrink-0",
          isLoading ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
          "transition-all duration-200",
          uploadQueue.length > 0 && "animate-pulse",
          isStopping && "opacity-70"
        )}
      >
        {isLoading ? (
          <StopIcon size={12} />
        ) : (
          <ArrowUpIcon size={12} className="h-3 w-3" />
        )}
      </Button>
    </ButtonTooltip>
  );
}

// Attach button for file uploads
function AttachButton({
  onClick,
  disabled = false
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ButtonTooltip content="Attach files">
      <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        className="rounded-full w-8 h-8 shrink-0 border-muted-foreground/20"
      >
        <PaperclipIcon size={12} />
      </Button>
    </ButtonTooltip>
  );
}

// Attachment item display
function AttachmentItem({ 
  attachment, 
  onRemove
}: { 
  attachment: ExtendedAttachment; 
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md text-xs group hover:bg-muted transition-colors duration-200">
      <span className="max-w-[150px] truncate">{attachment.name}</span>
      <button 
        type="button" 
        onClick={onRemove}
        className="opacity-50 hover:opacity-100"
      >
        <CrossIcon size={12} />
      </button>
    </div>
  );
}

// Custom hook for keyboard submission handling
function useKeyboardSubmit() {
  const submitMessage = useSubmitMessage();
  
  return useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only submit on Enter without shift key
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }, [submitMessage]);
}

// Hook to handle message submission
function useSubmitMessage() {
  const { 
    input, 
    attachments, 
    setAttachments,
    handleSubmit: contextHandleSubmit
  } = useInputContext();
  
  const resetTextarea = useCallback(() => {
    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = '60px';
    }
  }, []);

  return useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Only submit if there's either input or attachments
    if (input.trim() || attachments.length > 0) {
      contextHandleSubmit();
      setAttachments([]);
      resetTextarea();
    } else {
      console.log('[MultimodalInput] Prevented form submission with no input and no attachments');
    }
  }, [input, attachments, contextHandleSubmit, setAttachments, resetTextarea]);
}

// Button tooltip component
function ButtonTooltip({
  children,
  content,
  side = "top"
}: {
  children: React.ReactNode;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 