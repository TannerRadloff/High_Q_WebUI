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

import { sanitizeUIMessages, generateUUID, cn } from '@/lib/utils';
import { ArrowUpIcon, PaperclipIcon, StopIcon, CrossIcon, BotIcon } from './icons';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger 
} from './ui/tooltip';

// Define agent types (from AgentType enum)
const agentTypes = [
  { id: 'default', name: 'Standard Chat', description: 'Regular chat with the AI model' },
  { id: 'delegation', name: 'Delegation', description: 'Analyzes your request and delegates to specialized agents' },
  { id: 'research', name: 'Research', description: 'Finds information and answers factual questions' },
  { id: 'report', name: 'Report', description: 'Formats information into structured reports' },
  { id: 'triage', name: 'Triage', description: 'Analyzes and categorizes tasks' },
  { id: 'judge', name: 'Judge', description: 'Evaluates responses and provides feedback' }
];

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

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        // Simply return the file data for attachment
        // We'll process it further when the user submits
        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined && attachment !== null,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );
  
  // Wrap the original handleSubmit to process attachments
  const wrappedHandleSubmit = useCallback(
    async (event?: { preventDefault?: () => void }, chatRequestOptions?: ChatRequestOptions) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      
      if (uploadQueue.length > 0) {
        toast.info('Please wait for all files to upload');
        return;
      }
      
      // If there is no input and no attachments, don't submit
      if (!input.trim() && attachments.length === 0) {
        return;
      }
      
      console.log(`[MultimodalInput] Submitting with agent: ${selectedAgent}`);
      
      // Create a new options object with agent type and attachments
      const options: ChatRequestOptions = {};
      
      // Add experimental attachments
      if (attachments.length > 0) {
        options.experimental_attachments = attachments;
      }
      
      // Add agent type to data
      options.data = { agentType: selectedAgent };
      
      // Handle the submission
      handleSubmit(event, options);
      
      // Clear attachments after submission
      setAttachments([]);
      setLocalStorageInput('');
      resetHeight();
      
      if (width && width > 768) {
        textareaRef.current?.focus();
      }
    },
    [handleSubmit, attachments, setAttachments, uploadQueue, input, setLocalStorageInput, resetHeight, width, selectedAgent]
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
        className,
      )}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
          e.preventDefault();
          
          const usedAttachments = [...attachments];
          handleAgentSubmit();
          setAttachments([]);
          // Reset height only if no shift key
          resetHeight();
        }
      }}
    >
      <form 
        className="flex flex-col gap-3"
        onSubmit={e => {
          e.preventDefault();
          const usedAttachments = [...attachments];
          handleAgentSubmit();
          setAttachments([]);
          resetHeight();
        }}
      >
        {/* Agent selector */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Select
                value={selectedAgent}
                onValueChange={setSelectedAgent}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <BotIcon size={16} />
                    <SelectValue placeholder="Select Agent" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {agentTypes.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex flex-col">
                        <span>{agent.name}</span>
                        <span className="text-xs text-muted-foreground">{agent.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              `Ask the ${agentTypes.find(a => a.id === selectedAgent)?.name || 'selected'} agent...`
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
