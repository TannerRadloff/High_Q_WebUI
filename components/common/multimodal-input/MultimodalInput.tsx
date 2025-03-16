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
  // Create a local state to override isLoading if it's stuck
  const [forceNotLoading, setForceNotLoading] = useState(false);
  
  // Add direct chat mode toggle
  const [isDirectChatMode, setIsDirectChatMode] = useState<boolean>(false);
  // Track whether this is an initial load or a user action
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  
  // Store the mode preference in local storage
  useEffect(() => {
    // Load initial preference, default to false (delegation mode)
    const savedMode = localStorage.getItem('direct-chat-mode');
    if (savedMode) {
      setIsDirectChatMode(savedMode === 'true');
    }
    // After initial load, mark initialization as complete
    setIsInitialLoad(false);
  }, []);
  
  // Save the preference when it changes
  useEffect(() => {
    localStorage.setItem('direct-chat-mode', isDirectChatMode.toString());
    
    // Only show toast notification if this is not the initial load
    if (!isInitialLoad) {
      // Use the centralized notifications system with built-in debouncing
      const message = isDirectChatMode 
        ? "Direct chat mode enabled: Chatting directly with the model" 
        : "Delegation agent mode enabled: Agent will help route your requests";
      
      notifications.info(message, { 
        id: 'chat-mode-toggle',
        debounceMs: 2000 
      });
    }
  }, [isDirectChatMode, isInitialLoad]);
  
  // Force reset loading state after component mount
  useEffect(() => {
    // Short delay to ensure component is mounted before resetting
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log('[MultimodalInput] Force resetting initial loading state');
        setForceNotLoading(true);
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
    selectedWorkflowId,
    isDirectChatMode,
    setIsDirectChatMode
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
      stop();
      setMessages((messages) => sanitizeUIMessages(messages));
    } else {
      // Otherwise submit the message
      submitMessage(e);
    }
  };
  
  // Add keyboard shortcut to stop generation (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLoading && event.key === "Escape") {
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
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
  const { input, setInput, isLoading } = useInputContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const keyboardSubmit = useKeyboardSubmit();
  
  // Auto-resize textarea as user types
  const handleInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    setInput(textarea.value);
    
    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  }, [setInput]);
  
  // Handle keyboard submission with Enter (without Shift)
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    keyboardSubmit(event);
  }, [keyboardSubmit]);
  
  // Auto-focus the textarea on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  
  // Get placeholder text based on state
  const getPlaceholderText = () => {
    if (isLoading) {
      return "AI is generating...";
    }
    return "Message the AI assistant...";
  };
  
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
          'transition-colors duration-300 pr-12',
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
  
  // Handle click based on state
  const handleClick = () => {
    if (isLoading) {
      onStopGeneration();
    }
  };
  
  return (
    <ButtonTooltip content={isLoading ? "Stop generating" : "Send message"}>
      <Button
        size="icon"
        type={isLoading ? "button" : "submit"}
        onClick={isLoading ? handleClick : undefined}
        disabled={!isLoading && !hasContent}
        variant={isLoading ? "destructive" : "default"}
        className={cn(
          "rounded-full w-8 h-8 shrink-0",
          isLoading ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
          "transition-all duration-200",
          uploadQueue.length > 0 && "animate-pulse"
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