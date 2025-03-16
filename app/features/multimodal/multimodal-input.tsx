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
import { sanitizeUIMessages } from '@/utils/messages';
import { useFileUpload } from './hooks/useFileUpload';
import { InputProvider, useInputContext } from './context/InputContext';
import { ExtendedAttachment } from '@/types';

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
  // Create a local state to override isLoading if it's stuck
  const [forceNotLoading, setForceNotLoading] = useState(false);
  
  // Force reset loading state after component mount
  useEffect(() => {
    // Short delay to ensure component is mounted before resetting
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log('[MultimodalInput] Force resetting initial loading state');
        setForceNotLoading(true);
        // Optional: You could call stop() here if needed
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []); // Only run once on mount
  
  // Create modified context with the loading state fixed
  const effectiveIsLoading = forceNotLoading ? false : isLoading;
  
  const contextValue = {
    chatId,
    input,
    setInput,
    isLoading: effectiveIsLoading,
    stop,
    attachments,
    setAttachments,
    messages,
    setMessages,
    append,
    handleSubmit,
    selectedWorkflowId
  };

  return (
    <InputProvider value={contextValue}>
      <InputContainer className={className} />
    </InputProvider>
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
    attachments, 
    setAttachments
  } = useInputContext();
  
  // Local state to track button visibility
  const [showStopButton, setShowStopButton] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMessage = useSubmitMessage();
  
  // Setup file upload handling
  const { uploadQueue, handleFileChange } = useFileUpload(
    (newAttachments) => setAttachments(newAttachments)
  );
  
  // Function to handle attachment actions
  const handleAttachment = (action: 'remove', index: number) => {
    if (action === 'remove') {
      setAttachments(attachments.filter((_, i) => i !== index));
    }
  };
  
  // Update button visibility based on loading state
  useEffect(() => {
    if (isLoading) {
      setShowStopButton(true);
    } else {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowStopButton(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitMessage(e);
  };
  
  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex w-full flex-col gap-2"
    >
      {/* TextareaInput container */}
      <div className="relative">
        {/* Attach button */}
        <AttachButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        />
        
        {/* Textarea component */}
        <motion.div
          initial={false}
          animate={{ opacity: input.length > 0 ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative rounded-lg border bg-muted/30 before:pointer-events-none",
            // Enhanced focus-within effect
            "before:absolute before:inset-0 before:rounded-lg before:transition-all before:duration-300",
            "focus-within:before:shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.3),0_0_0_4px_rgba(var(--primary-rgb),0.1)]",
            // Enhanced hover effect
            "hover:before:shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.2)]"
          )}
        >
          <TextareaInput />
          
          {/* Send/Stop button container */}
          <div 
            className={cn(
              "absolute bottom-1 right-1.5",
              "transition-all duration-300 ease-in-out",
              "z-10",
              "send-button-container"
            )}
          >
            <AnimatePresence mode="wait">
              {showStopButton ? (
                <motion.div
                  key="stop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-0 right-0"
                >
                  <StopButton />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-0 right-0"
                >
                  <SendButton uploadQueue={uploadQueue} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* File attachment previews */}
        <div className="mt-2 flex flex-wrap gap-2">
          <AnimatePresence>
            {attachments.map((attachment, index) => (
              <AttachmentItem 
                key={`attachment-${index}`}
                attachment={attachment}
                onRemove={() => handleAttachment('remove', index)}
              />
            ))}
          </AnimatePresence>

          {uploadQueue.length > 0 && (
            <div className="flex h-8 items-center gap-1.5 rounded-md border bg-muted px-3 text-xs font-medium text-muted-foreground">
              {uploadQueue.length} files uploading...
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileChange(e, attachments)}
          className="hidden"
        />
      </div>
    </form>
  );
}

// Textarea component
function TextareaInput() {
  const { 
    input, 
    setInput, 
    isLoading, 
    selectedWorkflowId 
  } = useInputContext();
  
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleKeyDown = useKeyboardSubmit();
  
  // Local storage for draft messages
  const [savedValue, setSavedValue] = useLocalStorage<string>(
    'multimodal-input-draft',
    ''
  );
  
  // Ensure textarea size updates on content changes
  useEffect(() => {
    if (textareaRef.current) {
      // Auto-resize logic
      textareaRef.current.style.height = '60px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  
  // Keep localStorage in sync with input
  useEffect(() => {
    if (input !== savedValue) {
      setSavedValue(input);
    }
  }, [input, savedValue, setSavedValue]);
  
  // Restore from localStorage on mount
  useEffect(() => {
    if (savedValue && !input) {
      setInput(savedValue);
    }
  }, [savedValue, input, setInput]);
  
  // Force remove disabled attribute to ensure textarea is always clickable
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.hasAttribute('disabled')) {
      console.log('[TextareaInput] Removing disabled attribute from textarea');
      textareaRef.current.removeAttribute('disabled');
    }
  });
  
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      setInput(target.value);
      
      // Auto-resize
      target.style.height = '60px';
      target.style.height = `${target.scrollHeight}px`;
    },
    [setInput]
  );
  
  // Helper for placeholder text
  const getPlaceholderText = useCallback(() => {
    if (selectedWorkflowId) {
      return "Message the workflow (attach files or type / for commands)...";
    }
    return "Message Mimir (attach files or type / for commands)...";
  }, [selectedWorkflowId]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        tabIndex={0}
        name="message"
        placeholder={getPlaceholderText()}
        className={cn(
          "min-h-12 h-auto resize-none border-0 p-3",
          // Add left padding for the attach button
          "pl-12", 
          // Increased right padding to accommodate larger button
          "pr-14 lg:pr-16", 
          // Smooth transitions for focus
          "transition-all duration-200 ease-in-out",
          // Better visual feedback when typing
          "placeholder:text-muted-foreground/70 focus:placeholder:text-muted-foreground/50",
          // Subtle animation when typing
          "focus:shadow-none",
          !isFocused && "bg-transparent",
          !input && "text-muted-foreground"
        )}
        value={input}
        rows={1}
        // disabled={isLoading}
        onChange={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="Type a message"
      />
    </div>
  );
}

// Send button component with callback
function SendButton({ 
  uploadQueue
}: { 
  uploadQueue: string[];
}) {
  const { input } = useInputContext();
  const handleAgentSubmit = useAgentSubmit();
  const isDisabled = !input.trim() && uploadQueue.length === 0;
  const hasContent = !!input.trim() || uploadQueue.length > 0;
  
  const handleClick = () => {
    handleAgentSubmit(input);
  };
  
  return (
    <ButtonTooltip content="Send message" side="top">
      <Button
        type="button"
        size="icon"
        variant="default"
        className={cn(
          // Increase size from size-8 to size-10
          "size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center",
          // Enhanced hover effects with stronger glow and color change
          "transition-all duration-300 ease-in-out",
          "hover:bg-primary-600 hover:scale-105", 
          "hover:shadow-[0_0_15px_rgba(0,130,255,0.7)]",
          "active:scale-95 active:shadow-[0_0_10px_rgba(0,130,255,0.8)]",
          // Stronger resting state with subtle glow
          "shadow-[0_0_5px_rgba(0,120,255,0.3)]",
          // Add pulsing animation when there's content to send
          hasContent && "send-button-pulse",
          isDisabled && "opacity-70 hover:scale-100 hover:shadow-none"
        )}
        disabled={isDisabled}
        onClick={handleClick}
        aria-label="Send message"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          <ArrowUpIcon size={18} />
        </motion.div>
      </Button>
    </ButtonTooltip>
  );
}

// Stop button component with callback
function StopButton() {
  const { stop, setMessages } = useInputContext();
  
  const handleClick = () => {
    stop();
    setMessages((messages) => sanitizeUIMessages(messages));
  };
  
  return (
    <ButtonTooltip content="Stop generation" side="top">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          // Match size with SendButton for consistency
          "size-10 rounded-lg flex items-center justify-center",
          // Enhanced hover effects with destructive color theme
          "transition-all duration-300 ease-in-out",
          "text-destructive-foreground hover:bg-destructive/20",
          "hover:text-destructive hover:scale-105", 
          "hover:shadow-[0_0_15px_rgba(255,50,50,0.5)]",
          "active:scale-95 active:shadow-[0_0_10px_rgba(255,50,50,0.6)]",
          // Subtle glow in resting state
          "shadow-[0_0_5px_rgba(255,50,50,0.2)]"
        )}
        onClick={handleClick}
        aria-label="Stop generation"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          <StopIcon size={18} /> {/* Match icon size with SendButton */}
        </motion.div>
      </Button>
    </ButtonTooltip>
  );
}

// Attach button component
function AttachButton({
  onClick,
  disabled = false
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ButtonTooltip content="Attach files" side="top">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "absolute left-2 top-2.5 size-8 rounded-lg",
          "flex items-center justify-center",
          "transition-all duration-300 ease-in-out",
          "text-muted-foreground hover:text-primary",
          "hover:bg-primary/10 hover:scale-105",
          "hover:shadow-[0_0_8px_rgba(0,120,255,0.3)]",
          "active:scale-95",
          disabled && "opacity-50 pointer-events-none"
        )}
        aria-label="Attach files"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <PaperclipIcon size={18} />
        </motion.div>
      </Button>
    </ButtonTooltip>
  );
}

// Attachment item component
function AttachmentItem({ 
  attachment, 
  onRemove
}: { 
  attachment: ExtendedAttachment; 
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="flex h-8 items-center gap-1.5 rounded-md border bg-muted pr-2 text-muted-foreground hover:shadow-sm transition-all duration-200"
    >
      <div className="flex h-full items-center rounded-l-md border-r bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {attachment.contentType?.split('/')[0] || 'file'}
      </div>
      <div className="max-w-28 truncate text-xs">
        {attachment.name?.split('/').pop() || 'Attachment'}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground/50 transition-colors hover:bg-muted-foreground/20 hover:text-muted-foreground"
        aria-label={`Remove ${attachment.name?.split('/').pop() || 'attachment'}`}
      >
        <CrossIcon size={12} />
      </button>
    </motion.div>
  );
}

// Custom hooks for various functionality
function useKeyboardSubmit() {
  const { input, attachments, isLoading } = useInputContext();
  const handleAgentSubmit = useAgentSubmit();
  
  return useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (
        !isLoading &&
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault();
        
        // Only submit if there's input or attachments
        if (input.trim() || attachments.length > 0) {
          handleAgentSubmit(input);
        } else {
          console.log('[CHAT] No input or attachments to submit');
        }
      }
    },
    [isLoading, handleAgentSubmit, input, attachments]
  );
}

function useSubmitMessage() {
  const { 
    input, 
    attachments, 
    setAttachments 
  } = useInputContext();
  
  const handleAgentSubmit = useAgentSubmit();
  
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
      handleAgentSubmit(input);
      setAttachments([]);
      resetTextarea();
    } else {
      console.log('[MultimodalInput] Prevented form submission with no input and no attachments');
    }
  }, [input, attachments, handleAgentSubmit, setAttachments, resetTextarea]);
}

function useAgentSubmit() {
  const { handleSubmit, selectedWorkflowId } = useInputContext();
  
  return useCallback((userInput: string) => {
    // We're always using Mimir (default agent) first, but may include workflow metadata
    const options: ChatRequestOptions = {
      data: {
        ...(selectedWorkflowId ? { workflowId: selectedWorkflowId } : {})
      } as any // Use type assertion to avoid TypeScript errors
    };
    
    // Only pass options if we have a selected workflow
    if (selectedWorkflowId) {
      handleSubmit(undefined, options);
    } else {
      // Regular submission for default agent
      handleSubmit();
    }
  }, [handleSubmit, selectedWorkflowId]);
}

// Create a reusable tooltip component for our buttons
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
        <TooltipContent side={side} className="text-xs font-medium">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
