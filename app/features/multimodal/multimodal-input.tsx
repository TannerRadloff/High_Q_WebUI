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
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import equal from 'fast-deep-equal';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/utils/formatting';
import { showUniqueErrorToast } from '@/lib/api-error-handler';
import { ArrowUpIcon, PaperclipIcon, StopIcon, CrossIcon } from '@/src/components/common/icons';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { sanitizeUIMessages } from '@/utils/messages';
import { agentTypeConfig } from '@/src/config/agent-types';
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
  const contextValue = {
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
        'p-1.5 mt-auto z-10 bg-background/60 backdrop-blur-md backdrop-saturate-150 rounded-xl border sm:border border-border',
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
    isLoading
  } = useInputContext();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadQueue, handleFileChange } = useFileUpload(
    (newAttachments) => setAttachments(newAttachments)
  );
  
  const submitMessage = useSubmitMessage();
  
  // Track if the component has mounted to ensure we show the send button initially
  const [hasMounted, setHasMounted] = useState(false);
  
  // Set hasMounted to true after first render to ensure correct initial button state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <form
      onSubmit={(e) => submitMessage(e)}
      className="flex flex-1 flex-col items-start gap-2 relative"
    >
      <div className="flex w-full flex-row items-end gap-2">
        <div className="relative flex-1">
          <TextareaInput />
          
          {/* Both buttons are always visible, but one is visually hidden */}
          <div className="absolute bottom-2 right-2 z-20">
            {/* Only use AnimatePresence after component has mounted */}
            {hasMounted ? (
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="stop"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <StopButton />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SendButton uploadQueue={uploadQueue} />
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              /* Always show send button before mount */
              <SendButton uploadQueue={uploadQueue} />
            )}
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
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [localStorageInput, setLocalStorageInput] = useLocalStorage('input', '');
  
  // Initialize from localStorage
  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to localStorage
  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };
  
  const handleKeyDown = useKeyboardSubmit();
  
  // Get placeholder text
  const getPlaceholderText = useCallback(() => {
    if (selectedWorkflowId) {
      return "Send a message to your custom workflow...";
    }
    return "Send a message to Mimir...";
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
          'relative z-10 h-full border-none outline-none placeholder:text-muted-foreground/70',
          'transition-colors duration-300 pr-12', // Add padding for the send button
        )}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        value={input}
        spellCheck={false}
        rows={1}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
    </div>
  );
}

// Send button component
function SendButton({ uploadQueue }: { uploadQueue: string[] }) {
  const { input } = useInputContext();
  const handleAgentSubmit = useAgentSubmit();
  const isDisabled = !input.trim() && uploadQueue.length === 0;
  
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
      onClick={() => handleAgentSubmit(input)}
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

// Stop button component
function StopButton() {
  const { stop, setMessages } = useInputContext();
  
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:shadow-[0_0_8px_rgba(255,50,50,0.3)]"
      onClick={() => {
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
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
