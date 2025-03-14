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
import { v4 as uuidv4 } from 'uuid';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { useDidUpdate } from '@/hooks/use-did-update';
import { useAuth } from '@/components/auth/auth-provider';
import { handleAPIError } from '@/src/utils/auth-checks';

import { cn } from '@/utils/formatting';
import { showUniqueErrorToast } from '@/lib/api-error-handler';
import { ArrowUpIcon, PaperclipIcon, StopIcon, CrossIcon, BotIcon } from '@/src/components/common/icons';
import { Button } from '@/src/components/ui/button';
import { Textarea } from '@/src/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/src/components/ui/select';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger 
} from '@/src/components/ui/tooltip';
import { generateUUID } from '@/utils/auth';
import { sanitizeUIMessages } from '@/utils/messages';
import { agentTypeConfig } from '@/src/config/agent-types';
import { AgentSelector } from '@/src/components/features/agent-selector';

// Add an interface at the top of the file
interface MessageWithDocument extends Message {
  documentId?: string;
  artifactTitle?: string;
  artifactKind?: string;
}

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
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [isFocused, setIsFocused] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('default');
  const { user } = useAuth();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  }, [textareaRef]);

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
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
        // Filter out files that are too large before attempting upload
        const validFiles = files.filter(file => {
          if (file.size > 20 * 1024 * 1024) { // 20MB limit
            toast.error(`File ${file.name} is too large. Maximum size is 20MB.`);
            return false;
          }
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
  
  // Wrap the original handleSubmit to process attachments
  const wrappedHandleSubmit = useCallback(
    async (event?: { preventDefault?: () => void }, chatRequestOptions?: ChatRequestOptions) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      
      // Handle pending uploads
      if (uploadQueue.length > 0) {
        toast.info('Please wait for all files to upload');
        return;
      }
      
      // Check if there is already a loading state (prevents duplicate submissions)
      if (isLoading) {
        console.log('[MultimodalInput] Prevented submission during loading state');
        return;
      }
      
      // If there is no input and no attachments, don't submit
      if (!input.trim() && attachments.length === 0) {
        console.log('[MultimodalInput] Prevented submission with no input and no attachments');
        return;
      }
      
      // Check for excessively large input to avoid API errors
      const inputLength = input.trim().length;
      if (inputLength > 100000) { // 100K chars is excessive
        showUniqueErrorToast('Your message is too long. Please shorten it or split into multiple messages.');
        console.warn(`[MultimodalInput] Input length (${inputLength}) exceeds reasonable limits.`);
        return;
      }
      
      // Check for network connectivity
      if (!navigator.onLine) {
        showUniqueErrorToast('You appear to be offline. Please check your internet connection and try again.');
        console.warn('[MultimodalInput] Prevented submission while offline');
        return;
      }
      
      // Check authentication status before submitting
      if (!user) {
        handleAPIError({ status: 401, message: 'Authentication required' }, 'MultimodalInput submission');
        console.warn('[MultimodalInput] Prevented submission - authentication required');
        return;
      }
      
      console.log(`[MultimodalInput] Submitting with agent: ${selectedAgent} | Input length: ${inputLength} | Attachments: ${attachments.length}`);
      
      try {
        // Create a new options object with agent type and attachments
        const options: ChatRequestOptions = {};
        
        // Add experimental attachments
        if (attachments.length > 0) {
          // Verify attachments are valid before submitting
          const validAttachments = attachments.filter(att => 
            att && att.url && att.contentType
          );
          
          if (validAttachments.length !== attachments.length) {
            console.warn('[MultimodalInput] Some attachments were invalid and removed');
          }
          
          options.experimental_attachments = validAttachments;
        }
        
        // Add agent type to data
        options.data = { 
          agentType: selectedAgent,
          input: input.trim() // Add input to data to ensure it's available for validation
        };
        
        // Handle the submission with safety timeout
        let isSubmissionResolved = false;
        
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            if (!isSubmissionResolved) {
              reject(new Error('Request timed out after 30 seconds'));
            }
          }, 30000); // 30 second timeout
        });
        
        // Use Promise.race to implement timeout with cleaner handling
        try {
          await Promise.race([
            // Wrap handleSubmit to mark when it's done
            (async () => {
              try {
                await handleSubmit(event, options);
              } finally {
                isSubmissionResolved = true;
              }
            })(),
            timeoutPromise
          ]);
          
          // Only clear if submission was successful
          setAttachments([]);
          setLocalStorageInput('');
          resetHeight();
          
          if (width && width > 768) {
            textareaRef.current?.focus();
          }
        } catch (raceError) {
          // Handle timeout or other errors from the race
          console.error('[MultimodalInput] Error in Promise.race:', raceError);
          
          const errorMessage = raceError instanceof Error ? raceError.message : String(raceError);
          if (errorMessage.includes('timed out')) {
            showUniqueErrorToast('Request timed out. Please try again or check your network connection.');
          } else {
            throw raceError; // Re-throw non-timeout errors to be handled by outer catch
          }
        }
      } catch (error) {
        console.error('[MultimodalInput] Error during submission:', error);
        
        // Use the error handler to handle all error types consistently
        showUniqueErrorToast(error);
      }
    },
    [handleSubmit, attachments, setAttachments, uploadQueue, input, setLocalStorageInput, resetHeight, width, selectedAgent, isLoading, user]
  );
  
  // Function to handle agent submission
  const handleAgentSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      wrappedHandleSubmit(event);
    },
    [wrappedHandleSubmit]
  );

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
        onSubmit={wrappedHandleSubmit}
        className="flex flex-1 flex-col items-start gap-2 relative"
      >
        <div className="flex w-full flex-row items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              tabIndex={0}
              ref={textareaRef}
              placeholder="Send a message..."
              className={cn(
                'w-full pr-14 pl-4 py-3 min-h-[56px] rounded-md resize-none overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary',
                isLoading ? 'opacity-70' : ''
              )}
              autoFocus={width >= 1024}
              value={input}
              onChange={handleInput}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  
                  // Only submit if there's either input or attachments
                  if (input.trim() || attachments.length > 0) {
                    const usedAttachments = [...attachments];
                    handleAgentSubmit();
                    setAttachments([]);
                    // Reset height only if no shift key
                    resetHeight();
                  } else {
                    console.log('[MultimodalInput] Prevented keyboard submission with no input and no attachments');
                  }
                }
              }}
            >
              <form 
                className="flex flex-col gap-3"
                onSubmit={e => {
                  e.preventDefault();
                  
                  // Only submit if there's either input or attachments
                  if (input.trim() || attachments.length > 0) {
                    const usedAttachments = [...attachments];
                    handleAgentSubmit();
                    setAttachments([]);
                    resetHeight();
                  } else {
                    console.log('[MultimodalInput] Prevented form submission with no input and no attachments');
                  }
                }}
              >
                {/* Agent selector */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AgentSelector
                        selectedAgentId={selectedAgent}
                        onAgentChange={setSelectedAgent}
                        buttonSize="sm"
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      Select an AI agent type to process your request
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div
                  className={cn(
                    'flex relative w-full font-sans group/input border rounded-md overflow-hidden',
                    'rounded-md border-input bg-background px-3 py-2 text-sm',
                    // Glow when isFocused
                    isFocused &&
                      'ring-2 ring-purple-600 ring-offset-2 ring-offset-background',
                    'transition-shadow ease-in-out duration-300 ring-0',
                  )}
                >
                  <Textarea
                    ref={textareaRef}
                    tabIndex={0}
                    name="message"
                    placeholder={selectedAgent === 'default' ? 
                      "Message..." : 
                      `Ask the ${agentTypeConfig.find((a) => a.id === selectedAgent)?.name || 'selected'} agent...`
                    }
                    className={cn(
                      'max-h-64 min-h-[98px] grow whitespace-break-spaces text-secondary-foreground resize-none',
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
                  />
                </div>

                <div className="flex justify-between items-center">
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

                  <div className="flex items-center gap-1.5">
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
              </form>
            </Textarea>
          </div>
        </div>
      </form>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;

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

const AttachmentsButton = memo(PureAttachmentsButton);

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
      className="absolute bottom-1 right-1 size-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
      onClick={() => {
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
    >
      <StopIcon />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="absolute bottom-1 right-1 size-8 rounded-xl hover:bg-primary/10 hover:text-primary"
      disabled={!input.trim() && uploadQueue.length === 0}
      onClick={submitForm}
    >
      <ArrowUpIcon />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
