'use client';

import type { Message } from 'ai';
import type { ChatRequestOptions } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';

import { ChatHeader } from '@/src/components/layout';
import type { Vote } from '@/lib/db/schema';
import { fetcher } from '@/utils';
import { generateUUID } from '@/utils/auth';
import type { ExtendedAttachment } from '@/types';
import { notifications, showErrorToast } from '@/lib/api-error-handler';
import { isAuthenticationError, handleAPIError } from '@/utils/auth';
import { ErrorMessage } from '@/src/components/ui/error-message';

import { Artifact } from '@/app/features/artifact/artifact';
import { Messages } from './messages';
// Agent mode functionality is now integrated directly into the MultimodalInput component
import { MultimodalInput } from '@/components/common/multimodal-input';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import dynamic from 'next/dynamic';
import AgentStatusPanel, { AgentStatus } from '@/app/features/agents/agent-status-panel';
import AgentTracePanel, { AgentTrace } from '@/app/features/agent-trace-panel/agent-trace-panel';
import { v4 as uuidv4 } from 'uuid';
import { processWithAgents } from '@/lib/agents/agentService';
import { WorkflowSelector } from './workflow-selector';
import { executeWorkflow } from '@/lib/agents/workflowService';
import { 
  createAgentTrace, 
  addTraceStep, 
  completeAgentTrace,
  addStreamingTraceStep
} from '@/lib/agents/agentTraceService';
import { AgentTraceViewer } from '@/components/ui/agent-trace-viewer';
import { initializeAgentTraceService } from '@/lib/tracing/agentTraceService';
import { SupabaseTraceProcessor } from '@/lib/tracing/supabaseTraceProcessor';
import { configureTracing, trace } from '@/agents/tracing';

// Add type declaration for window.generateRandomStars
declare global {
  interface Window {
    generateRandomStars?: () => HTMLElement;
  }
}

// Interface to help type the error messages from the API
interface StreamErrorMessage {
  type: 'error';
  error: string;
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [usesFallbackModel, setUsesFallbackModel] = useState(false);
  const [chatId, setChatId] = useState<string>(id);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { user } = useAuth();
  
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'general' | 'authentication' | 'network'>('general');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showWelcome, setShowWelcome] = useState(id === 'create-new');
  
  // Add animation and UI state
  const [showSparkles, setShowSparkles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Add Mimir delegation agent states
  const [delegationStatus, setDelegationStatus] = useState<'idle' | 'delegating' | 'delegated'>('idle');
  const [activeAgent, setActiveAgent] = useState<string>('MimirAgent');
  const [delegationReason, setDelegationReason] = useState<string>('');
  
  // Add state to track if agent trace service has been initialized
  const [isAgentTraceServiceInitialized, setIsAgentTraceServiceInitialized] = useState(false);
  
  // Optimize scroll behavior to bottom of messages
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);
  
  // Add new state for chat creation
  const [hasMadeInitialChatRequest, setHasMadeInitialChatRequest] = useState(false);
  
  // State for agent mode
  const [isAgentMode, setIsAgentMode] = useState<boolean>(false);
  
  // Add state for selected workflow
  const [selectedWorkflowId, setSelectedWorkflowId] = useLocalStorage<string | null>('selected-workflow-id', null);
  
  // Add state for trace panel
  const [currentTrace, setCurrentTrace] = useState<AgentTrace | null>(null);
  const [isTraceVisible, setIsTraceVisible] = useState(false);
  const [isAgentTraceVisible, setIsAgentTraceVisible] = useLocalStorage<boolean>('agent-trace-visible', false);
  
  // Add state for agent trace viewer
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [isTraceViewerVisible, setIsTraceViewerVisible] = useState(false);
  
  // Function to initialize agent trace service when needed
  const initializeAgentTraceServiceIfNeeded = useCallback(() => {
    if (!isAgentTraceServiceInitialized) {
      // Initialize the agent trace service
      initializeAgentTraceService();
      
      // Configure tracing with Supabase processor
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabaseTraceProcessor = new SupabaseTraceProcessor(supabaseUrl, supabaseKey);
        configureTracing();
      }
      
      // Update the initialization flag
      setIsAgentTraceServiceInitialized(true);
      console.log('Agent trace service initialized on demand');
    }
  }, [isAgentTraceServiceInitialized]);
  
  // Effect to sync trace visibility with local storage preference
  useEffect(() => {
    if (currentTrace) {
      setIsTraceVisible(isAgentTraceVisible);
    }
  }, [currentTrace, isAgentTraceVisible]);

  // Handle network status and display
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notifications.success('Connection restored', { 
        id: 'connection-status',
        duration: 3000 
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      notifications.error('Network connection lost', { 
        id: 'connection-status',
        duration: Infinity
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Dismiss the toast when component unmounts
      notifications.dismiss('connection-status');
    };
  }, []);

  // Clear error state when chat ID changes
  useEffect(() => {
    setHasError(false);
    setErrorType('general');
    setErrorMessage(null);
    setIsFirstLoad(true);
    
    if (id === 'create-new') {
      setShowWelcome(true);
    } else {
      setShowWelcome(initialMessages.length === 0);
    }
  }, [id, initialMessages.length]);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    // Use immediate scroll for initial messages
    const behavior = isFirstLoad ? 'auto' : 'smooth';
    scrollToBottom(behavior);
    
    // Show sparkle animation on first message from AI
    if (isFirstLoad && initialMessages.length > 0) {
      setIsFirstLoad(false);
      
      // Briefly show sparkles animation
      setTimeout(() => {
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 1500);
      }, 500);
    }
  }, [initialMessages, isFirstLoad, scrollToBottom]);

  // Handle new chat creation
  useEffect(() => {
    // Create a flag to track if we're already attempting to create a chat
    let isAttemptingCreate = false;
    let chatCreationTimeout: NodeJS.Timeout;
    
    async function createNewChat() {
      if (id === 'create-new' && user && !isAttemptingCreate && !isCreatingChat && !hasMadeInitialChatRequest) {
        try {
          // Set both flags to prevent concurrent requests
          isAttemptingCreate = true;
          setIsCreatingChat(true);
          setHasMadeInitialChatRequest(true);
          
          const newId = generateUUID();
          
          // Add a slightly longer delay to ensure authentication is fully established
          // This helps prevent race conditions with the Supabase auth cookies
          await new Promise(resolve => {
            chatCreationTimeout = setTimeout(resolve, 1000);
          });
          
          // Create a new chat in the database
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: newId,
              messages: [], // Explicitly provide empty messages array
              title: 'New Chat',
              visibility: selectedVisibilityType,
            }),
            credentials: 'include', // Ensure cookies are sent with the request
          });
          
          if (!response.ok) {
            // Handle specific status codes
            if (response.status === 401) {
              throw new Error('Authentication required. Please try logging in again.');
            } else if (response.status === 429) {
              throw new Error('Too many requests. Please try again in a moment.');
            } else if (response.status >= 500) {
              throw new Error('Server error. Please try again later.');
            }
            
            // Try to parse error response
            const data = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            console.error('Chat creation error:', data);
            throw new Error(data.error || `Failed to create chat: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.id) {
            console.log(`Successfully created chat with ID: ${data.id}`);
            setChatId(data.id);
            // Update the URL without refreshing the page
            window.history.replaceState({}, '', `/chat/${data.id}`);
          } else {
            throw new Error('No chat ID returned from server');
          }
        } catch (error) {
          showErrorToast(error, { id: 'create-chat-error' });
          setHasError(true);
          
          // Check if it's an auth error
          if (isAuthenticationError(error)) {
            setErrorType('authentication');
            setErrorMessage('Authentication required. Please try logging in again.');
          } else {
            setErrorType('general');
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create new chat. Please try again.');
          }
          
          // Reset hasMadeInitialChatRequest to allow one more attempt
          setTimeout(() => {
            setHasMadeInitialChatRequest(false);
          }, 5000);
        } finally {
          // Always reset the flags
          isAttemptingCreate = false;
          setIsCreatingChat(false);
        }
      }
    }

    createNewChat();
    
    // Cleanup function
    return () => {
      isAttemptingCreate = false;
      if (chatCreationTimeout) {
        clearTimeout(chatCreationTimeout);
      }
    };
  }, [id, user, selectedVisibilityType, hasMadeInitialChatRequest]);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
    error,
  } = useChat({
    api: '/api/agent-query',
    id: chatId,
    body: {
      agentType: 'Mimir', // Use the Mimir delegation agent by default
      userId: user?.id,
      chatId,
      selectedChatModel,
      selectedVisibilityType
    },
    initialMessages,
    initialInput: "", // Add initialInput to prevent auto-submission with empty query
    onResponse(response) {
      // Reset error states when we get a successful response
      setHasError(false);
      setErrorMessage(null);
      
      // Handle delegation information in the response
      try {
        const responseText = response.headers.get('x-delegation-status');
        if (responseText) {
          const delegationInfo = JSON.parse(responseText);
          if (delegationInfo.agentName) {
            setDelegationStatus('delegated');
            setActiveAgent(delegationInfo.agentName);
            setDelegationReason(delegationInfo.reasoning || '');
            
            // Animate the delegation transition
            setShowSparkles(true);
            setTimeout(() => setShowSparkles(false), 2500);
          }
        }
      } catch (err) {
        console.error('Failed to parse delegation info', err);
      }
      
      // Check for HTTP errors
      if (!response.ok) {
        const status = response.status;
        console.error(`[CHAT] HTTP Error (${status}): ${response.statusText}`);
        
        setHasError(true);
        
        // Handle auth errors
        if (status === 401 || status === 403) {
          setErrorType('authentication');
          setErrorMessage('Authentication required to access this feature.');
          handleAPIError({ status, statusText: response.statusText }, 'Chat response error');
        } else {
          // Handle other errors
          setErrorType('general');
          setErrorMessage(`API error: ${response.statusText || 'Request failed'}`);
          notifications.error(`API error: ${response.statusText || 'Request failed'}`, {
            id: 'chat-api-error'
          });
        }
      } else {
        // Reset error state on successful response
        setHasError(false);
        setErrorType('general');
        setErrorMessage(null);
        setShowWelcome(false);
        
        // Show brief sparkle animation on new response
        setTimeout(() => {
          setShowSparkles(true);
          setTimeout(() => setShowSparkles(false), 1500);
        }, 300);
      }
    },
    onFinish: (message) => {
      console.log(`[CHAT] Chat completed successfully with model: ${selectedChatModel}`);
      setHasError(false);
      
      if (message.content.includes('fallback model')) {
        console.log('[CHAT] Using fallback model detected');
        setUsesFallbackModel(true);
        notifications.warning(`The ${selectedChatModel} model is currently unavailable. Using a fallback model instead.`, {
          id: 'fallback-model'
        });
      }
      
      // Refresh chat history
      mutate('/api/history');
      
      // Scroll to bottom of chat
      scrollToBottom();
    },
    onError: (error) => {
      console.error(`[CHAT] Error with model ${selectedChatModel}:`, error);
      
      setHasError(true);
      
      // Set error type and message based on authentication status
      if (isAuthenticationError(error)) {
        setErrorType('authentication');
        setErrorMessage('Authentication required to access this feature.');
        handleAPIError(error, 'Chat API error');
      } else {
        setErrorType('general');
        setErrorMessage('An error occurred while processing your message. Please try again.');
        notifications.error('An error occurred while processing your message. Please try again.', {
          id: 'chat-processing-error'
        });
      }
    },
  });
  
  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${chatId}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<ExtendedAttachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Function to generate random stars for chat background
  const generateRandomStars = () => {
    if (typeof window === 'undefined') return;
    
    // Use the globally accessible function if it exists
    if (window.generateRandomStars && typeof window.generateRandomStars === 'function') {
      return (window.generateRandomStars as () => HTMLElement)();
    }
    
    return null;
  };

  // Optimize the renderDelegationStatus function with useCallback
  const renderDelegationStatus = useCallback(() => {
    if (delegationStatus === 'idle' || isLoading) return null;
    
    return (
      <motion.div 
        className="flex items-center gap-2 mb-2 p-2 rounded-md bg-slate-50 dark:bg-slate-900 text-sm border border-slate-200 dark:border-slate-800"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex-shrink-0">
          {delegationStatus === 'delegating' ? (
            <div className="animate-pulse h-2 w-2 rounded-full bg-blue-500"></div>
          ) : (
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
          )}
        </div>
        <div>
          {delegationStatus === 'delegating' 
            ? selectedWorkflowId 
              ? 'Executing workflow...' 
              : 'Mimir is analyzing your request...' 
            : `Delegated to ${activeAgent}`}
          {delegationReason && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{delegationReason}</p>
          )}
        </div>
      </motion.div>
    );
  }, [delegationStatus, isLoading, selectedWorkflowId, activeAgent, delegationReason]);

  // State for tracking active agents
  const [activeAgents, setActiveAgents] = useState<AgentStatus[]>([]);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const chatMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content
  }));
  const [currentAgent, setCurrentAgent] = useState<{
    id: string;
    name: string;
    type: string;
    icon: string;
  } | null>(null);

  // Track when AI is generating for the status panel
  useEffect(() => {
    // When AI is generating, add a generating agent to the active agents list if not already present
    if (isLoading) {
      const generatingAgentId = 'current-generation';
      
      // Check if we already have this agent in the list
      const existingAgentIndex = activeAgents.findIndex(agent => agent.id === generatingAgentId);
      
      if (existingAgentIndex === -1) {
        // Initialize agent tracing if needed
        initializeAgentTraceServiceIfNeeded();
        
        // Add new generating agent status
        const generatingAgent: AgentStatus = {
          id: generatingAgentId,
          name: 'AI Assistant',
          type: 'generation',
          icon: '🤖',
          originalTask: 'Processing current message',
          currentAction: 'Generating response...',
          status: 'working',
          progress: 50, // Indeterminate progress
          startTime: new Date(),
          lastUpdateTime: new Date()
        };
        
        setActiveAgents(prev => [...prev, generatingAgent]);
        
        // Ensure the agent panel is open when generating
        if (!isAgentPanelOpen) {
          setIsAgentPanelOpen(true);
        }
        
        // Create a new trace for this generation
        const traceId = `trace_${uuidv4()}`;
        setCurrentTraceId(traceId);
        setIsTraceViewerVisible(true);
        
        // Start a trace for this generation
        const traceObj = trace('AI Assistant Generation', {
          trace_id: traceId,
          workflow_name: 'Chat Generation',
          trace_metadata: {
            model: selectedChatModel,
            chatId: chatId
          }
        });
        
        // Start the trace
        traceObj.start();
      }
    } else {
      // When AI stops generating, update the generating agent's status or remove it
      const generatingAgentId = 'current-generation';
      const existingAgentIndex = activeAgents.findIndex(agent => agent.id === generatingAgentId);
      
      if (existingAgentIndex !== -1) {
        // Update to completed or remove based on your preference
        setActiveAgents(prev => 
          prev.map(agent => 
            agent.id === generatingAgentId 
              ? { 
                  ...agent, 
                  status: 'completed',
                  currentAction: 'Response completed',
                  progress: 100,
                  lastUpdateTime: new Date() 
                } 
              : agent
          )
        );
        
        // Remove the generating agent after a delay
        setTimeout(() => {
          setActiveAgents(prev => prev.filter(agent => agent.id !== generatingAgentId));
        }, 3000);
      }
    }
  }, [isLoading, activeAgents, isAgentPanelOpen, selectedChatModel, chatId, initializeAgentTraceServiceIfNeeded]);

  // Customize the stop function to update agent status
  const customStop = useCallback(() => {
    // Update the generating agent's status to stopped
    const generatingAgentId = 'current-generation';
    const existingAgentIndex = activeAgents.findIndex(agent => agent.id === generatingAgentId);
    
    if (existingAgentIndex !== -1) {
      setActiveAgents(prev => 
        prev.map(agent => 
          agent.id === generatingAgentId 
            ? { 
                ...agent, 
                status: 'failed',
                currentAction: 'Generation stopped by user',
                progress: 100,
                lastUpdateTime: new Date() 
              } 
            : agent
        )
      );
      
      // Remove the agent after a delay
      setTimeout(() => {
        setActiveAgents(prev => prev.filter(agent => agent.id !== generatingAgentId));
      }, 3000);
    }
    
    // Call the original stop function
    stop();
  }, [activeAgents, stop]);

  // Customize the toggleAgentPanel function with useCallback
  const toggleAgentPanel = useCallback(() => {
    setIsAgentPanelOpen(prev => !prev);
  }, []);

  // Toggle trace panel visibility
  const toggleTracePanel = useCallback(() => {
    setIsTraceVisible(prev => !prev);
    setIsAgentTraceVisible(prev => !prev);
  }, [setIsAgentTraceVisible]);

  // Update the chat with agent processing and track agent progress
  const processMessageWithAgents = async (
    message: string, 
    previousMessages: any[] = [], 
    sourceAgentId: string | null = null, 
    targetAgentId: string | null = null,
    useWorkflow: boolean = false
  ) => {
    try {
      // Initialize agent tracing if needed
      initializeAgentTraceServiceIfNeeded();
      
      // Create a new agent status entry
      const agentId = targetAgentId || 'delegation-agent';
      const agentName = targetAgentId ? currentAgent?.name || 'Specialized Agent' : useWorkflow ? 'Workflow Agent' : 'Delegation Agent';
      const agentIcon = targetAgentId ? currentAgent?.icon || '🤖' : useWorkflow ? '🔄' : '👨‍💼';
      
      // Add agent to the active agents list
      const newAgentStatus: AgentStatus = {
        id: agentId,
        name: agentName,
        type: targetAgentId ? 'specialized' : useWorkflow ? 'workflow' : 'delegation',
        originalTask: message,
        currentAction: 'Processing request...',
        status: 'working',
        progress: 10,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        icon: agentIcon
      };
      
      setActiveAgents(prev => [...prev, newAgentStatus]);
      
      // Create a new agent trace
      const trace = createAgentTrace(agentId, agentName, agentIcon, message);
      setCurrentTrace(trace);
      setIsTraceVisible(true);
      
      // Add initial thought step to trace
      addTraceStep(
        trace.id,
        'thought',
        `Starting to process request: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
        { messageLength: message.length, previousMessagesCount: previousMessages.length },
        'completed'
      );
      
      let response;
      
      // If a workflow is selected and we're using it, execute the workflow
      if (selectedWorkflowId && useWorkflow) {
        setDelegationStatus('delegating');
        
        // Create a streaming action step for workflow execution
        const { stepId, updateContent, completeStep } = addStreamingTraceStep(
          trace.id,
          'action',
          `Executing workflow: ${selectedWorkflowId}...`,
          { workflowId: selectedWorkflowId },
        );
        
        // Update agent status
        setActiveAgents(prev => 
          prev.map(agent => 
            agent.id === agentId 
              ? { 
                  ...agent, 
                  progress: 25, 
                  currentAction: `Executing workflow: ${selectedWorkflowId}`, 
                  lastUpdateTime: new Date() 
                } 
              : agent
          )
        );
        
        try {
          // Call the workflow execution API
          const apiResponse = await fetch('/api/agent-workflow-execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              workflowId: selectedWorkflowId,
              message,
              chatId
            })
          });
          
          if (!apiResponse.ok) {
            // Complete the streaming step with error
            completeStep(`Failed to execute workflow: ${apiResponse.status} ${apiResponse.statusText}`);
            
            // Add error trace step
            addTraceStep(
              trace.id,
              'error',
              `Failed to execute workflow: ${apiResponse.status} ${apiResponse.statusText}`,
              { status: apiResponse.status }
            );
            
            completeAgentTrace(trace.id, false, 'API request failed');
            throw new Error('Failed to execute workflow');
          }
          
          // Complete the streaming step
          completeStep(`Executed workflow: ${selectedWorkflowId} successfully`);
          
          response = await apiResponse.json();
          
          // Add observation trace step
          addTraceStep(
            trace.id,
            'observation',
            `Workflow execution completed successfully`,
            { workflowResult: response.success }
          );
          
          // Update delegation status
          setDelegationStatus('delegated');
          setActiveAgent('Workflow Agent');
          setDelegationReason(`Using workflow: ${selectedWorkflowId}`);
        } catch (error) {
          // Complete the streaming step with error if not already completed
          completeStep(`Error executing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      } else {
        // Add decision step about using standard agent handoff
        addTraceStep(
          trace.id,
          'decision',
          sourceAgentId 
            ? `Delegating from ${sourceAgentId} to ${targetAgentId || 'delegation agent'}`
            : `Using standard agent handoff`,
          { sourceAgentId, targetAgentId, messageLength: message.length }
        );
        
        // Create a streaming action step for agent processing
        const { stepId, updateContent, completeStep } = addStreamingTraceStep(
          trace.id,
          'action',
          `Processing with ${targetAgentId || 'delegation agent'}...`,
          { sourceAgentId, targetAgentId }
        );
        
        // Update agent status
        setActiveAgents(prev => 
          prev.map(agent => 
            agent.id === agentId 
              ? { 
                  ...agent, 
                  progress: 30, 
                  currentAction: `Processing request`, 
                  lastUpdateTime: new Date() 
                } 
              : agent
          )
        );
        
        try {
          // Use the standard agent handoff
          const apiResponse = await fetch('/api/agent-handoff', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message,
              sourceAgentId,
              targetAgentId,
              chatId,
              previousMessages
            })
          });
          
          if (!apiResponse.ok) {
            // Complete the streaming step with error
            completeStep(`Agent handoff failed: ${apiResponse.status} ${apiResponse.statusText}`);
            
            // Add error trace step
            addTraceStep(
              trace.id,
              'error',
              `Agent handoff failed: ${apiResponse.status} ${apiResponse.statusText}`,
              { status: apiResponse.status }
            );
            
            completeAgentTrace(trace.id, false, 'API request failed');
            throw new Error('Failed to process message with agent');
          }
          
          // Complete the streaming step
          completeStep(`Processing completed successfully`);
          
          response = await apiResponse.json();
          
          // Update agent status
          setActiveAgents(prev => 
            prev.map(agent => 
              agent.id === agentId 
                ? { 
                    ...agent, 
                    progress: 70, 
                    currentAction: `Generating response`, 
                    lastUpdateTime: new Date() 
                  } 
                : agent
            )
          );
          
          // If response contains an agent handoff
          if (response.delegatedTo) {
            addTraceStep(
              trace.id,
              'handoff',
              `Delegated to ${response.delegatedTo}`,
              { 
                from: response.delegatedFrom || 'delegation-agent', 
                to: response.delegatedTo,
                reason: response.delegationReason || 'No reason provided'
              }
            );
            
            // Update delegation status
            setDelegationStatus('delegated');
            setActiveAgent(response.delegatedTo);
            setDelegationReason(response.delegationReason || 'No reason provided');
          }
        } catch (error) {
          // Complete the streaming step with error if not already completed
          completeStep(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }
      
      // Create a streaming observation step for response generation
      const { stepId, updateContent, completeStep } = addStreamingTraceStep(
        trace.id,
        'observation',
        `Generating response...`,
        { responseLength: 0 }
      );
      
      // Simulate streaming updates for the response generation
      const responseLength = response.response.length;
      const updateInterval = Math.max(50, Math.min(200, responseLength / 20)); // Update between 50ms and 200ms
      
      // Update the streaming step with progress
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, updateInterval));
        updateContent(`Generating response... ${i * 20}%`);
      }
      
      // Complete the streaming step
      completeStep(`Response generated successfully (${responseLength} characters)`);
      
      // Complete the trace
      completeAgentTrace(
        trace.id, 
        true, 
        response.reasoning || 'Request processed successfully'
      );
      
      // Update current agent
      setCurrentAgent(response.agent);
      
      // Update the status to completed
      setActiveAgents(prev => 
        prev.map(agent => 
          agent.id === agentId 
            ? { 
                ...agent, 
                progress: 100, 
                currentAction: 'Response completed', 
                status: 'completed',
                lastUpdateTime: new Date() 
              } 
            : agent
        )
      );
      
      // Remove completed agent after 10 seconds
      setTimeout(() => {
        setActiveAgents(prev => prev.filter(agent => agent.id !== agentId));
      }, 10000);
      
      return response;
    } catch (error) {
      console.error('Error processing message with agents:', error);
      
      // Update trace with error
      if (currentTrace) {
        addTraceStep(
          currentTrace.id,
          'error',
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error: String(error) }
        );
        
        completeAgentTrace(
          currentTrace.id, 
          false, 
          `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      
      // Update the status to failed
      setActiveAgents(prev => 
        prev.map(agent => 
          agent.id === targetAgentId || (!targetAgentId && (agent.type === 'delegation' || agent.type === 'workflow'))
            ? { 
                ...agent, 
                progress: 100, 
                currentAction: 'Failed to process request', 
                status: 'failed',
                lastUpdateTime: new Date() 
              } 
            : agent
        )
      );
      
      throw error;
    }
  };

  // Simplified handleSubmitWithAgents that uses the consolidated processMessageWithAgents
  const handleSubmitWithAgents = useCallback(
    async (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions
    ) => {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      
      if (!input.trim() || isLoading) {
        return;
      }
      
      try {
        // Initialize agent tracing if needed
        initializeAgentTraceServiceIfNeeded();
        
        // Add user message to UI
        const userMessage = {
          id: uuidv4(),
          role: 'user',
          content: input
        };
        
        // Update chat using the existing append function to show user message
        append({
          id: userMessage.id,
          content: userMessage.content,
          role: 'user'
        }, chatRequestOptions);
        
        // Process with either workflow or delegation agent
        const delegationResult = await processMessageWithAgents(
          input, 
          messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content
          })), 
          null, 
          null, 
          !!selectedWorkflowId // Use workflow if selected
        );
        
        // Add agent response to UI
        const agentMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: delegationResult.response,
          agentInfo: delegationResult.agent
        };
        
        // Add the agent response
        append({
          id: agentMessage.id,
          content: agentMessage.content,
          role: 'assistant'
        }, chatRequestOptions);
        
        // Clear input
        setInput('');
        
        // Should we open the agent panel when first agent becomes active?
        if (activeAgents.length === 1 && !isAgentPanelOpen) {
          setIsAgentPanelOpen(true);
        }
        
      } catch (error) {
        console.error('Error submitting message with agents:', error);
        notifications.error('Failed to process your message', { id: 'message-error' });
        
        // Stop loading state on error
        customStop();
      }
    },
    [
      input, 
      isLoading, 
      append, 
      setInput, 
      activeAgents, 
      isAgentPanelOpen, 
      setIsAgentPanelOpen, 
      customStop, 
      selectedWorkflowId, 
      messages,
      processMessageWithAgents,
      initializeAgentTraceServiceIfNeeded
    ]
  );

  // Custom handleSubmit function - chooses which approach to use based on config
  const customHandleSubmit = useCallback(
    (
      event?: { preventDefault?: () => void } | undefined,
      chatRequestOptions?: ChatRequestOptions
    ) => {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      
      // Don't submit empty messages or when loading
      if (!input.trim() || isLoading || isCreatingChat) {
        return;
      }
      
      // Track that we've made a chat request
      setHasMadeInitialChatRequest(true);
      
      // Hide welcome pane on submit
      if (showWelcome) {
        setShowWelcome(false);
      }
      
      // If we're using a workflow or agent mode, handle with agents
      if (selectedWorkflowId || isAgentMode) {
        handleSubmitWithAgents(event, chatRequestOptions);
      } else {
        // Otherwise use the standard handleSubmit from useChat
        handleSubmit(event, chatRequestOptions);
      }
    },
    [
      input, 
      isLoading, 
      isCreatingChat, 
      setHasMadeInitialChatRequest,
      showWelcome, 
      setShowWelcome,
      selectedWorkflowId, 
      isAgentMode, 
      handleSubmitWithAgents, 
      handleSubmit
    ]
  );

  // Handle authentication
  const handleAuthentication = useCallback(() => {
    window.location.href = '/login';
  }, []);

  // Optimize the handleAgentModeToggle function with useCallback
  const handleAgentModeToggle = useCallback(() => {
    setIsAgentMode(!isAgentMode);
    
    // Reset agent panel state when disabling agent mode
    if (isAgentMode) {
      setIsAgentPanelOpen(false);
      setActiveAgents([]);
    }
  }, [isAgentMode]);

  // This function sends the chat state to the clipboard for debugging
  const sendStateToClipboard = () => {
    try {
      const debugText = JSON.stringify(
        {
          chatId: id,
          messageCount: messages.length,
          modelId: selectedChatModel,
          visibility: selectedVisibilityType,
          hasError,
          errorType,
          errorMessage
        },
        null,
        2
      );
      
      navigator.clipboard.writeText(debugText);
      console.log("[CHAT] Debug state copied to clipboard");
      notifications.info('Debug info copied to clipboard', { id: 'debug-info' });
    } catch (error) {
      console.error("[CHAT] Error copying debug info:", error);
    }
  };

  // Add a function to close the trace viewer
  const closeTraceViewer = useCallback(() => {
    setIsTraceViewerVisible(false);
  }, []);

  return (
    <div 
      className="relative flex flex-col w-full h-full overflow-hidden"
      ref={chatContainerRef}
    >
      {/* Network Status Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-destructive/80 text-destructive-foreground text-center py-1 px-4 z-50"
          >
            <span className="text-sm">You are currently offline. Reconnect to continue chatting.</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Ensure animation container exists for client-side rendering */}
      {typeof window !== 'undefined' && (
        <div id="animation-container-placeholder" className="sr-only">
          {/* This div ensures the animation containers exist in the DOM */}
        </div>
      )}
      
      {/* Sparkles Animation */}
      <AnimatePresence>
        {showSparkles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <div className="sparkles-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="sparkle"
                  initial={{ 
                    opacity: 0,
                    scale: 0,
                    x: Math.random() * 100 - 50,
                    y: Math.random() * 100 - 50,
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100,
                  }}
                  transition={{
                    duration: 1 + Math.random() * 0.5,
                    delay: Math.random() * 0.5,
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: `hsl(${Math.random() * 360}, 100%, 70%)`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Chat Header */}
      <ChatHeader 
        chatId={chatId}
        selectedModelId={selectedChatModel}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
        isLoading={isLoading}
      />
      
      {/* Main Chat Content */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4 px-4 relative" aria-live="polite">
        {/* Show a welcome message if this is a new chat */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 p-6 rounded-lg bg-primary/5 max-w-3xl mx-auto text-center"
          >
            <h1 className="text-2xl font-bold mb-3">Welcome to HighQ</h1>
            <p className="text-muted-foreground mb-6">
              Chat with Mimir, our intelligent delegation agent that routes your questions to specialized AI agents.
            </p>
            
            {/* Add workflow selector to welcome message with a better label */}
            <div className="mb-6 max-w-md mx-auto">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium mb-1">Select an optional agent workflow:</p>
                <div className="w-full max-w-xs">
                  <WorkflowSelector
                    selectedWorkflowId={selectedWorkflowId}
                    onWorkflowSelect={setSelectedWorkflowId}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Workflows define how specialized agents collaborate on your tasks
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 text-left">
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left welcome-grid-item"
                onClick={() => setInput("What can you help me with?")}
                aria-label="Ask: What can you help me with?"
              >
                <span className="text-sm font-medium">What can you help me with?</span>
              </button>
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left welcome-grid-item"
                onClick={() => setInput("Create a short story about a space explorer.")}
                aria-label="Ask: Create a creative story"
              >
                <span className="text-sm font-medium">Generate a creative story</span>
              </button>
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left welcome-grid-item"
                onClick={() => setInput("Explain the concept of quantum computing in simple terms.")}
                aria-label="Ask: Explain a complex topic"
              >
                <span className="text-sm font-medium">Explain a complex topic</span>
              </button>
              <button
                className="p-3 rounded-md border border-border hover:bg-primary/5 transition-colors text-left welcome-grid-item"
                onClick={() => setInput("Help me debug this code snippet: function sum(a, b) { retur a + b; }")}
                aria-label="Ask: Debug some code"
              >
                <span className="text-sm font-medium">Debug some code</span>
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Show delegation status */}
        <AnimatePresence>
          {renderDelegationStatus()}
        </AnimatePresence>
        
        {/* Agent Trace Panel */}
        <AgentTracePanel 
          trace={currentTrace}
          isVisible={isTraceVisible}
          isLoading={isLoading}
          onClose={toggleTracePanel}
        />
        
        {/* Loading indicator when no messages yet */}
        {isLoading && messages.length === 0 && !showWelcome && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-4 bg-primary/10 rounded w-24 mb-2.5"></div>
              <div className="h-2 bg-primary/10 rounded w-32"></div>
            </div>
          </div>
        )}
      
        {/* Chat Messages */}
        <Messages
          messages={messages}
          isLoading={isLoading}
          showLoadingUi={showSparkles}
          error={error}
          baseUrlPath={`/chat/${chatId}`}
          chatId={chatId}
          votes={votes ?? []}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={false}
        />
        
        {/* Used to scroll to bottom of messages */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Visible when artifacts are open */}
      {isArtifactVisible && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center overflow-auto">
          <Artifact 
            chatId={chatId}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            stop={customStop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
            handleSubmit={customHandleSubmit}
            reload={reload}
            votes={votes}
            isReadonly={isReadonly}
          />
        </div>
      )}
        
      {/* Unified Error Message - using our new component */}
      <AnimatePresence>
        {hasError && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center px-4">
            <ErrorMessage
              type={errorType}
              message={errorMessage || undefined}
              onRetry={errorType !== 'authentication' ? reload : undefined}
              onLogin={errorType === 'authentication' ? handleAuthentication : undefined}
              className="max-w-2xl"
            />
          </div>
        )}
      </AnimatePresence>
      
      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Workflow selector with a clear label */}
          {!showWelcome && (
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleTracePanel}
                  className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${isTraceVisible ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"></path>
                    <path d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"></path>
                    <circle cx="12" cy="12" r="1"></circle>
                  </svg>
                  {currentTrace ? 'View Agent Trace' : 'No Trace Available'}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Agent workflow:</span>
                <WorkflowSelector
                  selectedWorkflowId={selectedWorkflowId}
                  onWorkflowSelect={setSelectedWorkflowId}
                  className="w-48"
                />
              </div>
            </div>
          )}
          
          {/* Chat input with Mimir as the default agent */}
          <MultimodalInput
            chatId={chatId}
            input={input}
            setInput={setInput}
            isLoading={isLoading || isCreatingChat}
            stop={customStop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
            handleSubmit={customHandleSubmit}
            className="enhanced-input"
            selectedWorkflowId={selectedWorkflowId}
          />
          
          {/* Model info at the bottom */}
          {usesFallbackModel ? (
            <div className="text-center mt-2 text-xs text-amber-500">
              Using fallback model • {selectedChatModel} unavailable
            </div>
          ) : (
            <div className="text-center mt-2 text-xs text-muted-foreground">
              {isOnline 
                ? `Mimir ${selectedWorkflowId ? '+ Custom Workflow' : ''} • ${selectedChatModel} • ${selectedVisibilityType}` 
                : "Offline Mode"}
            </div>
          )}
        </div>
      </div>
      
      {/* Agent status panel */}
      <AgentStatusPanel 
        agents={activeAgents}
        isOpen={isAgentPanelOpen}
        onToggle={toggleAgentPanel}
      />
      
      {/* Agent trace viewer */}
      {currentTraceId && (
        <AgentTraceViewer
          traceId={currentTraceId}
          isVisible={isTraceViewerVisible}
          onClose={closeTraceViewer}
        />
      )}
      
      {/* Add CSS for animations */}
      <style jsx>{`
        .chat-sending-pulse {
          animation: pulse 0.3s ease-in-out;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.995); }
          100% { transform: scale(1); }
        }
        
        .sparkles-container {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        
        .sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
