'use client';

import { type Message } from 'ai';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Chat } from '@/components/chat';
import { AgentInterface } from '@/components/agent-interface';
import { useAgentMode } from '@/hooks/use-agent-mode';
import { type VisibilityType } from '@/components/visibility-selector';

type AgentModeSwitcherProps = {
  id: string
  selectedChatModel: string
  selectedVisibilityType: VisibilityType
  isReadonly: boolean
};

export function AgentModeSwitcher({
  id,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: AgentModeSwitcherProps) {
  const { agentMode } = useAgentMode();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  
  // This would typically be used to load any existing messages from an API
  useEffect(() => {
    // For now, we're just setting empty initial messages
    setInitialMessages([]);
  }, []);
  
  // We'll use Framer Motion to animate between the two modes
  return (
    <AnimatePresence mode="wait">
      {agentMode ? (
        <motion.div
          key="agent-interface"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="size-full"
        >
          <AgentInterface />
        </motion.div>
      ) : (
        <motion.div
          key="chat-interface"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="size-full"
        >
          <Chat
            key={id}
            id={id}
            initialMessages={initialMessages}
            selectedChatModel={selectedChatModel}
            selectedVisibilityType={selectedVisibilityType}
            isReadonly={isReadonly}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
} 