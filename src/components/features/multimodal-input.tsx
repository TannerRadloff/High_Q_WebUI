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

function PureMultimodalInput({
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [isFocused, setIsFocused] = useState(false);
  const lockInput = isLoading;

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

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

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    // Height is handled by CSS auto-height
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`[MultimodalInput] Uploading file: ${file.name} (${file.size} bytes)`);
      
      // Validate file size
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        showUniqueErrorToast(`File ${file.name} is too large. Maximum size is 20MB.`);
        return null;
      }
      
      // Validate file type - add common allowable types
      const allowedTypes = [
        'image/', 'application/pdf', 'text/', 'application/json', 
        'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-'
      ];
      
      const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
      if (!isAllowedType && file.type) {
        console.warn(`[MultimodalInput] Potentially unsupported file type: ${file.type}`);
        // Just a warning, still allow upload
      }
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;
        
        console.log(`[MultimodalInput] File uploaded successfully: ${pathname}`);
        
        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      
      const responseData = await response.json().catch(() => ({ error: 'Invalid server response' }));
      const errorMessage = responseData.error || 'Unknown upload error';
      console.error(`[MultimodalInput] Upload error: ${errorMessage}`);
      showUniqueErrorToast(`Failed to upload ${file.name}: ${errorMessage}`);
      return null;
    } catch (error) {
      console.error(`[MultimodalInput] Upload exception:`, error);
      showUniqueErrorToast(`Failed to upload ${file.name}. Please try again!`);
      return null;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      
      if (files.length === 0) return;
      
      console.log(`[MultimodalInput] Processing ${files.length} files`);
      setUploadQueue(files.map((file) => file.name));
      
      try {
        // Process all files
        const validFiles = files.filter(file => {
          // File size validation is already done in uploadFile
          return true;
        });
        
        if (validFiles.length === 0) {
          setUploadQueue([]);
          return;
        }
        
        const uploadPromises = validFiles.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment): attachment is NonNullable<typeof attachment> => 
            attachment !== undefined && attachment !== null
        );
        
        console.log(`[MultimodalInput] Successfully uploaded ${successfullyUploadedAttachments.length}/${validFiles.length} files`);
        
        if (successfullyUploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...successfullyUploadedAttachments,
          ]);
        } else if (validFiles.length > 0) {
          // If we had valid files but none uploaded successfully
          toast.error('Failed to upload files. Please try again.');
        }
      } catch (error) {
        console.error('[MultimodalInput] Error processing files:', error);
        toast.error('Error uploading files. Please try again.');
      } finally {
        setUploadQueue([]);
        
        // Reset the file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [setAttachments, uploadFile]
  );
  
  // Update the getPlaceholderText function to be memoized
  const getPlaceholderText = useCallback(() => {
    if (selectedWorkflowId) {
      return "Send a message to your custom workflow...";
    }
    return "Send a message to Mimir...";
  }, [selectedWorkflowId]);

  // Optimize the handleAgentSubmit function
  const handleAgentSubmit = useCallback((userInput: string) => {
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

  // Fix the function signature for these calls
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (
        !lockInput &&
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
    [lockInput, handleAgentSubmit, input, attachments]
  );

  // Restore the resetTextarea function
  const resetTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '60px';
    }
  }, []);

  // Later in the submitMessage function, restore the reference to resetTextarea
  const submitMessage = useCallback((e?: React.FormEvent) => {
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

  return (
    <div
      className={cn(
        'p-1.5 mt-auto z-10 bg-background/60 backdrop-blur-md backdrop-saturate-150 rounded-xl border sm:border border-border',
        'relative lg:py-3 lg:px-3.5 w-full',
        'shadow-lg hover:shadow-xl transition-all duration-200',
        'enhanced-input',
        isFocused && 'ring-1 ring-primary border-primary/50',
        className
      )}
    >
      <form
        onSubmit={(e) => submitMessage(e)}
        className="flex flex-1 flex-col items-start gap-2 relative"
      >
        <div className="flex w-full flex-row items-end gap-2">
          <div className="relative flex-1">
            <div
              className={cn(
                'flex relative w-full font-sans group/input border rounded-md overflow-hidden',
                'border-input bg-background px-3 py-2 text-sm',
                'transition-shadow ease-in-out duration-300 ring-0',
                // Fixed conditional styling - only apply ring when focused
                isFocused && 'ring-1 ring-primary ring-offset-1 ring-offset-background',
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
                  'transition-colors duration-300',
                )}
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={input}
                spellCheck={false}
                rows={1}
                onKeyDown={handleKeyDown}
              />
            </div>

            {isLoading ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <SendButton
                submitForm={handleAgentSubmit}
                input={input}
                uploadQueue={uploadQueue}
              />
            )}
          </div>
        </div>

        <div className="flex justify-between items-center w-full">
          <div className="flex gap-1.5">
            <AttachmentsButton
              fileInputRef={fileInputRef}
              isLoading={isLoading}
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
                    <div
                      key={index}
                      className="flex h-8 items-center gap-1.5 rounded-md border bg-muted pr-2 text-muted-foreground"
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
                      >
                        <CrossIcon />
                      </button>
                    </div>
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
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </form>
    </div>
  );
}

// Optimized memoization with clearer comparison function
export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    // Only re-render when these key props change
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.selectedWorkflowId !== nextProps.selectedWorkflowId) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.chatId !== nextProps.chatId) return false;
    
    // Default to true (don't re-render) for all other prop changes
    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isLoading: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-10 shrink-0 rounded-xl border-border/40 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_10px_rgba(0,150,255,0.3)]"
      onClick={() => fileInputRef.current?.click()}
      disabled={isLoading}
    >
      <PaperclipIcon />
    </Button>
  );
}

// Optimized AttachmentsButton with proper memoization
const AttachmentsButton = memo(PureAttachmentsButton, 
  (prevProps, nextProps) => prevProps.isLoading === nextProps.isLoading
);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="absolute bottom-2 right-2 size-8 rounded-xl hover:bg-destructive/10 hover:text-destructive z-20"
      onClick={() => {
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
    >
      <StopIcon />
    </Button>
  );
}

// StopButton doesn't need complex comparison as its props are unlikely to change
const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: (userInput: string) => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="default"
      className="absolute bottom-4 right-4 size-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 z-30 flex items-center justify-center shadow-lg"
      disabled={!input.trim() && uploadQueue.length === 0}
      onClick={() => submitForm(input)}
    >
      <ArrowUpIcon className="h-6 w-6" />
    </Button>
  );
}

// Optimized SendButton with improved comparison
const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  // Check if button should be disabled/enabled
  const prevEnabled = prevProps.input.trim() || prevProps.uploadQueue.length > 0;
  const nextEnabled = nextProps.input.trim() || nextProps.uploadQueue.length > 0;
  
  // Only re-render if enabled state changes or input changes
  if (prevEnabled !== nextEnabled) return false;
  if (prevProps.input !== nextProps.input) return false;
  
  return true;
});
