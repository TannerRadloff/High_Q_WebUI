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
  // Track agent trace visibility preference
  const [isAgentTraceVisible, setIsAgentTraceVisible] = useLocalStorage<boolean>('agent-trace-visible', false);
  
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
          isAgentTraceVisible,
          setIsAgentTraceVisible,
        }}
      >
        <InputContainer className="enhanced-input" />
      </InputProvider>
    </div>
  );
}

// Main component that uses the context
function InputContainer({ className }: { className?: string }) {
  const { isLoading, stop, isDirectChatMode, isAgentTraceVisible, setIsAgentTraceVisible } = useInputContext();
  
  // Add state for generation status
  const [generationStatus, setGenerationStatus] = useState<{
    isGenerating: boolean;
    progress: number;
    statusText: string;
  }>({
    isGenerating: false,
    progress: 0,
    statusText: ''
  });
  
  // Update generation status when loading state changes
  useEffect(() => {
    if (isLoading) {
      setGenerationStatus({
        isGenerating: true,
        progress: 10,
        statusText: 'Starting AI generation...'
      });
      
      // Simulate progress updates
      const interval = setInterval(() => {
        setGenerationStatus(prev => {
          // Don't update if we've stopped generating
          if (!prev.isGenerating) return prev;
          
          // Calculate new progress, capping at 90% (we'll set to 100% when complete)
          const newProgress = Math.min(90, prev.progress + Math.random() * 5);
          
          // Update status text based on progress
          let statusText = 'Starting AI generation...';
          if (newProgress > 20) statusText = 'Processing your request...';
          if (newProgress > 40) statusText = 'Analyzing context...';
          if (newProgress > 60) statusText = 'Generating response...';
          if (newProgress > 80) statusText = 'Finalizing response...';
          
          return {
            ...prev,
            progress: newProgress,
            statusText
          };
        });
      }, 800);
      
      return () => clearInterval(interval);
    } else {
      // When loading completes, show 100% briefly then reset
      setGenerationStatus(prev => ({
        ...prev,
        progress: 100,
        statusText: 'Response complete'
      }));
      
      // Reset after a short delay
      const timeout = setTimeout(() => {
        setGenerationStatus({
          isGenerating: false,
          progress: 0,
          statusText: ''
        });
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);
  
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
      {/* Generation Status Indicator */}
      <AnimatePresence>
        {generationStatus.isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-md"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0 h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7" />
                  </svg>
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    {generationStatus.statusText}
                  </span>
                  <span className="text-xs text-blue-700 dark:text-blue-400">
                    {Math.round(generationStatus.progress)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-blue-200 dark:bg-blue-900/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${generationStatus.progress}%` }}
                  ></div>
                </div>
              </div>
              {isLoading && (
                <button
                  onClick={stop}
                  className="flex-shrink-0 p-1 rounded-full bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 transition-colors"
                  aria-label="Stop generation"
                >
                  <StopIcon size={12} />
                </button>
              )}
            </div>
            
            {/* Agent trace visibility toggle */}
            {setIsAgentTraceVisible && (
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="agent-trace-toggle"
                    checked={isAgentTraceVisible}
                    onCheckedChange={setIsAgentTraceVisible}
                    className="h-3.5 w-7 data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="agent-trace-toggle" className="text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                    Show agent trace
                  </Label>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400">
                  {isDirectChatMode ? 'Direct chat mode' : 'Agent delegation mode'}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <MessageForm />
    </div>
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

// Message form component
function MessageForm() {
  const { 
    isLoading,
    attachments 
  } = useInputContext();
  const submitMessage = useSubmitMessage();
  
  // Use empty array as default for uploadQueue
  const uploadQueue: string[] = [];
  
  return (
    <form 
      onSubmit={submitMessage}
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