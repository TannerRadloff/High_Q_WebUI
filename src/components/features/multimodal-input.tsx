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
import { useIsMobile } from '@/hooks/use-mobile';

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
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';

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
  const { user } = useAuth();
  const isMobile = width < 768; // Define isMobile based on window width
  const lockInput = isLoading; // Define lockInput based on isLoading state

  // Direct agent integration - no longer behind a toggle
  const [selectedAgentId, setSelectedAgentId] = useLocalStorage('selected-agent-id', 'default');

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
  
  // Handle form submission with agent metadata
  const handleAgentSubmit = (userInput: string) => {
    console.log(`[CHAT] Processing request with agent: ${selectedAgentId}`);
    
    // Get the agent type name from config if not using default
    const agentConfig = agentTypeConfig.find(agent => agent.id === selectedAgentId);
    
    // Only add agent metadata if a non-default agent is selected
    if (selectedAgentId !== 'default' && agentConfig) {
      // Add metadata to indicate which agent to use
      const options: ChatRequestOptions = {
        data: {
          agentId: selectedAgentId,
          agentType: agentConfig.name
        }
      };
      
      // Submit with agent metadata
      handleSubmit(undefined, options);
    } else {
      // Regular submission for default agent
      handleSubmit();
    }
  };

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
    [lockInput, isMobile, handleAgentSubmit, input, attachments]
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
        onSubmit={(e) => {
          e.preventDefault();
          handleAgentSubmit(input);
        }}
        className="flex flex-1 flex-col items-start gap-2 relative"
      >
        {/* Agent Selector - Always shown */}
        <div className="w-full mb-2">
          <AgentSelector
            selectedAgentId={selectedAgentId}
            onAgentChange={setSelectedAgentId}
            displayMode="buttons"
            buttonSize="sm"
            className="w-full"
          />
        </div>

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
              onKeyDown={handleKeyDown}
            >
              <form 
                className="flex flex-col gap-3"
                onSubmit={e => {
                  e.preventDefault();
                  
                  // Only submit if there's either input or attachments
                  if (input.trim() || attachments.length > 0) {
                    const usedAttachments = [...attachments];
                    handleAgentSubmit(input);
                    setAttachments([]);
                    resetHeight();
                  } else {
                    console.log('[MultimodalInput] Prevented form submission with no input and no attachments');
                  }
                }}
              >
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
                    placeholder={selectedAgentId === 'default' ? 
                      "Message..." : 
                      `Ask the ${agentTypeConfig.find((a) => a.id === selectedAgentId)?.name || 'selected'} agent...`
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
  submitForm: (userInput: string) => void;
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
      onClick={() => submitForm(input)}
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
