'use client';

import type {
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import type { ExtendedAttachment } from '@/types';
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

import { cn } from '@/utils/formatting';
import { showUniqueErrorToast } from '@/lib/api-error-handler';
import { ArrowUpIcon, PaperclipIcon, StopIcon, CrossIcon } from '@/src/components/common/icons';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { sanitizeUIMessages } from '@/utils/messages';
import { useFileUpload } from './hooks/useFileUpload';
import { InputProvider, useInputContext } from './context/InputContext';

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

// Form component
function MessageForm() {
  const { 
    input, 
    setInput, 
    attachments, 
    setAttachments,
    isLoading,
    stop
  } = useInputContext();
  
  // Local state to track actual button visibility
  const [showStopButton, setShowStopButton] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadQueue, handleFileChange } = useFileUpload(
    (newAttachments) => setAttachments(newAttachments)
  );
  
  const submitMessage = useSubmitMessage();
  
  // Update button visibility based on loading state
  useEffect(() => {
    console.log('[MultimodalInput] Current isLoading state:', isLoading);
    setShowStopButton(isLoading);
  }, [isLoading]);
  
  // Auto-reset button state after timeout to prevent stuck state
  useEffect(() => {
    let resetTimer: NodeJS.Timeout;
    
    if (showStopButton) {
      // If stop button is showing for more than 30 seconds, reset it
      resetTimer = setTimeout(() => {
        console.log('[MultimodalInput] Force resetting button state after timeout');
        setShowStopButton(false);
      }, 30000);
    }
    
    return () => {
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [showStopButton]);

  return (
    <form
      onSubmit={(e) => submitMessage(e)}
      className="flex flex-1 flex-col items-start gap-2 relative"
    >
      <div className="flex w-full flex-row items-end gap-2">
        <div className="relative flex-1">
          <TextareaInput />
          
          {/* Button container */}
          <div className="absolute bottom-2 right-2">
            {/* Show both buttons, but only one is visible at a time */}
            <div className="relative">
              {/* Send button */}
              <div style={{ 
                opacity: showStopButton ? 0 : 1,
                position: 'absolute',
                top: 0,
                right: 0,
                transition: 'opacity 0.2s ease-in-out',
                pointerEvents: showStopButton ? 'none' : 'auto'
              }}>
                <SendButton 
                  uploadQueue={uploadQueue} 
                  onSend={() => setShowStopButton(true)}
                />
              </div>
              
              {/* Stop button */}
              <div style={{ 
                opacity: showStopButton ? 1 : 0,
                position: 'absolute',
                top: 0,
                right: 0,
                transition: 'opacity 0.2s ease-in-out',
                pointerEvents: showStopButton ? 'auto' : 'none'
              }}>
                <StopButton onStop={() => setShowStopButton(false)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center w-full">
        <div className="flex gap-1.5">
          <AttachmentsButton
            fileInputRef={fileInputRef}
          />

          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex flex-wrap gap-1.5"
              >
                {attachments.map((attachment, index) => (
                  <AttachmentItem 
                    key={index} 
                    attachment={attachment} 
                    index={index} 
                  />
                ))}
              </motion.div>
            )}
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
    <div
      className={cn(
        'flex relative w-full font-sans group/input border rounded-md overflow-hidden',
        'border-input bg-background px-3 py-2 text-sm',
        'transition-all ease-in-out duration-200',
        'hover:border-primary/50 hover:shadow-sm',
        isFocused && 'ring-2 ring-primary/30 border-primary shadow-[0_0_10px_rgba(0,120,255,0.15)]',
      )}
    >
      <Textarea
        ref={textareaRef}
        tabIndex={0}
        name="message"
        placeholder={getPlaceholderText()}
        className={cn(
          'max-h-64 min-h-[60px] grow whitespace-break-spaces text-secondary-foreground resize-none',
          'bg-transparent p-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'border-none outline-none placeholder:text-muted-foreground/70',
          'transition-colors duration-300 pr-12', // Add padding for the send button
        )}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        value={input}
        spellCheck={false}
        rows={1}
        onKeyDown={handleKeyDown}
        // Remove disabled to ensure it's always interactive
        // disabled={isLoading}
      />
    </div>
  );
}

// Send button component with callback
function SendButton({ 
  uploadQueue,
  onSend
}: { 
  uploadQueue: string[];
  onSend?: () => void;
}) {
  const { input } = useInputContext();
  const handleAgentSubmit = useAgentSubmit();
  const isDisabled = !input.trim() && uploadQueue.length === 0;
  
  const handleClick = () => {
    if (onSend) onSend();
    handleAgentSubmit(input);
  };
  
  return (
    <Button
      type="button"
      size="icon"
      variant="default"
      className={cn(
        "size-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center",
        "transition-all duration-200 hover:shadow-[0_0_8px_rgba(0,120,255,0.5)]",
        isDisabled && "opacity-70"
      )}
      disabled={isDisabled}
      onClick={handleClick}
      aria-label="Send message"
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.1 }}
      >
        <ArrowUpIcon size={16} />
      </motion.div>
    </Button>
  );
}

// Stop button component with callback
function StopButton({ onStop }: { onStop?: () => void }) {
  const { stop, setMessages } = useInputContext();
  
  const handleClick = () => {
    stop();
    setMessages((messages) => sanitizeUIMessages(messages));
    if (onStop) onStop();
  };
  
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:shadow-[0_0_8px_rgba(255,50,50,0.3)]"
      onClick={handleClick}
      aria-label="Stop generation"
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.1 }}
      >
        <StopIcon size={16} />
      </motion.div>
    </Button>
  );
}

// Attachment button component
function AttachmentsButton({
  fileInputRef,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const { isLoading } = useInputContext();
  
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "size-10 shrink-0 rounded-xl border-border/40 bg-background/50",
        "hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_10px_rgba(0,150,255,0.3)]",
        "transition-all duration-200"
      )}
      onClick={() => fileInputRef.current?.click()}
      disabled={isLoading}
      aria-label="Attach files"
    >
      <motion.div
        whileHover={{ rotate: 15, scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <PaperclipIcon size={20} />
      </motion.div>
    </Button>
  );
}

// Attachment item component
function AttachmentItem({ 
  attachment, 
  index 
}: { 
  attachment: ExtendedAttachment; 
  index: number;
}) {
  const { attachments, setAttachments } = useInputContext();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      key={index}
      className="flex h-8 items-center gap-1.5 rounded-md border bg-muted pr-2 text-muted-foreground hover:shadow-sm transition-all duration-200"
    >
      <div className="flex h-full items-center rounded-l-md border-r bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {attachment.contentType?.split('/')[0] || 'file'}
      </div>
      <div className="max-w-28 truncate text-xs">
        {attachment.name?.split('/').pop() || 'attachment'}
      </div>
      <button
        type="button"
        onClick={() => {
          setAttachments(
            attachments.filter((_, i) => i !== index),
          );
        }}
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
