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
  // Add a way to enable/disable debugging with a key combination
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle debug overlay with Alt+D
      if (e.altKey && e.key === 'd') {
        setShowDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <>
      <div
        className={cn(
          'p-1.5 mt-auto z-10 bg-background/60 backdrop-blur-md backdrop-saturate-150 rounded-xl border sm:border border-border',
          'relative lg:py-3 lg:px-3.5 w-full',
          'shadow-lg hover:shadow-xl transition-all duration-200',
          'enhanced-input',
          className
        )}
        style={{ 
          pointerEvents: 'auto',
          isolation: 'isolate' // Creates a new stacking context
        }}
        onClick={(e) => {
          // This helps with debugging click issues
          console.log("[MultimodalInput] InputContainer clicked", e.target);
        }}
      >
        <MessageForm />
      </div>
      
      {showDebug && <DebugOverlay />}
    </>
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadQueue, handleFileChange } = useFileUpload(
    (newAttachments) => setAttachments(newAttachments)
  );
  
  const submitMessage = useSubmitMessage();
  
  // Track if the component has mounted to ensure we show the send button initially
  const [hasMounted, setHasMounted] = useState(false);
  
  // Add a local state to track button state manually if needed
  const [forceButtonState, setForceButtonState] = useState<'send' | 'stop' | null>(null);
  
  // Set hasMounted to true after first render to ensure correct initial button state
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Debug logging for isLoading state
  useEffect(() => {
    console.log("[MultimodalInput] isLoading state changed:", isLoading);
  }, [isLoading]);
  
  // Force reset isLoading state after a timeout
  useEffect(() => {
    let resetTimer: NodeJS.Timeout;
    
    if (isLoading) {
      // If loading takes longer than 30 seconds, assume it's stuck and force reset
      resetTimer = setTimeout(() => {
        console.log("[MultimodalInput] Force resetting isLoading state after timeout");
        stop(); // Call stop function to reset loading state
        setForceButtonState('send'); // Force the send button to appear
      }, 30000); // 30 seconds timeout
    }
    
    return () => {
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isLoading, stop]);
  
  // Determine which button to show based on isLoading state and forceButtonState
  const showStopButton = forceButtonState === 'stop' || (isLoading && forceButtonState !== 'send');
  const showSendButton = forceButtonState === 'send' || (!isLoading && forceButtonState !== 'stop');

  return (
    <form
      onSubmit={(e) => submitMessage(e)}
      className="flex flex-1 flex-col items-start gap-2 relative"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex w-full flex-row items-end gap-2">
        <div className="relative flex-1" style={{ pointerEvents: 'auto' }}>
          <TextareaInput />
          
          {/* Both buttons are always visible, but one is visually hidden */}
          <div className="absolute bottom-2 right-2 z-20">
            {/* Only use AnimatePresence after component has mounted */}
            {hasMounted ? (
              <AnimatePresence mode="wait">
                {showStopButton ? (
                  <motion.div
                    key="stop"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <StopButton onFallbackComplete={() => setForceButtonState('send')} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SendButton 
                      uploadQueue={uploadQueue} 
                      onBeforeSubmit={() => setForceButtonState('stop')}
                    />
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
  
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleKeyDown = useKeyboardSubmit();
  
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

  // Debug click handling
  useEffect(() => {
    if (textareaRef.current) {
      console.log("[MultimodalInput] TextareaInput mounted");
      
      // Check if there's anything above the textarea that might be blocking clicks
      const checkForBlockingElements = () => {
        if (!textareaRef.current) return;
        
        const rect = textareaRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        const elementsAtPoint = document.elementsFromPoint(x, y);
        console.log("[MultimodalInput] Elements at textarea center:", elementsAtPoint);
        
        // Check if our textarea is actually in the list
        const textareaInList = elementsAtPoint.some(el => el === textareaRef.current);
        if (!textareaInList) {
          console.warn("[MultimodalInput] Textarea is being obscured by other elements!");
        }
      };
      
      // Run this check after the component is fully rendered
      setTimeout(checkForBlockingElements, 1000);
    }
  }, []);

  return (
    <div
      className={cn(
        'flex relative w-full font-sans group/input border rounded-md overflow-hidden',
        'border-input bg-background px-3 py-2 text-sm',
        'transition-all ease-in-out duration-200',
        'hover:border-primary/50 hover:shadow-sm',
        isFocused && 'ring-2 ring-primary/30 border-primary shadow-[0_0_10px_rgba(0,120,255,0.15)]',
      )}
      style={{ 
        pointerEvents: 'auto',
        position: 'relative',
        isolation: 'isolate' // Creates a new stacking context
      }}
      onClick={(e) => {
        console.log("[MultimodalInput] TextareaInput container clicked", e.target);
      }}
    >
      <Textarea
        ref={textareaRef}
        tabIndex={0}
        name="message"
        placeholder={getPlaceholderText()}
        className={cn(
          'max-h-64 min-h-[60px] grow whitespace-break-spaces text-secondary-foreground resize-none',
          'bg-transparent p-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'relative z-0 h-full border-none outline-none placeholder:text-muted-foreground/70',
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
        style={{ 
          pointerEvents: 'auto',
          outline: '1px dashed rgba(0, 200, 0, 0.2)' // Visual indicator for debugging
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log("[MultimodalInput] Textarea clicked", e.target);
        }}
      />
    </div>
  );
}

// Send button component with before submit handler
function SendButton({ 
  uploadQueue,
  onBeforeSubmit
}: { 
  uploadQueue: string[],
  onBeforeSubmit?: () => void
}) {
  const { input } = useInputContext();
  const handleAgentSubmit = useAgentSubmit();
  const isDisabled = !input.trim() && uploadQueue.length === 0;
  
  const handleSubmit = () => {
    if (onBeforeSubmit) {
      onBeforeSubmit();
    }
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
      onClick={handleSubmit}
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

// Stop button component with fallback complete handler
function StopButton({ 
  onFallbackComplete 
}: { 
  onFallbackComplete?: () => void 
}) {
  const { stop, setMessages } = useInputContext();
  
  const handleStop = () => {
    stop();
    setMessages((messages) => sanitizeUIMessages(messages));
    
    // Call the fallback handler after a short delay to ensure loading state is reset
    if (onFallbackComplete) {
      setTimeout(onFallbackComplete, 300);
    }
  };
  
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:shadow-[0_0_8px_rgba(255,50,50,0.3)]"
      onClick={handleStop}
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

// Add a debugging component at the bottom of the file
function DebugOverlay() {
  const { isLoading } = useInputContext();
  
  return (
    <div
      className="fixed bottom-2 right-2 bg-black/50 text-white p-2 text-xs rounded-md z-50"
      style={{ pointerEvents: 'none' }}
    >
      <div>isLoading: {isLoading ? 'true' : 'false'}</div>
    </div>
  );
}
