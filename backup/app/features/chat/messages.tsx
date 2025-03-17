'use client';

import { memo } from 'react';
import type { Message } from 'ai';
import type { Vote } from '@/lib/db/schema';
import type { ChatRequestOptions } from 'ai';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  chatId: string;
  votes?: Vote[];
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void;
  reload: (chatRequestOptions?: ChatRequestOptions) => Promise<string | null | undefined>;
  isReadonly: boolean;
}

function PureChatMessages({
  messages,
  isLoading,
  chatId,
  votes,
  setMessages,
  reload,
  isReadonly,
}: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {messages.map((message, index) => (
        <div 
          key={message.id}
          className={`p-4 rounded-md ${message.role === 'user' ? 'bg-primary/10 self-end' : 'bg-accent/30'}`}
        >
          <div className="text-sm font-medium mb-1">
            {message.role === 'user' ? 'You' : 'AI'}
          </div>
          <div className="whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="p-4 rounded-md bg-accent/30">
          <div className="text-sm font-medium mb-1">AI</div>
          <div className="animate-pulse">Thinking...</div>
        </div>
      )}
    </div>
  );
}

export const ChatMessages = memo(PureChatMessages);
export const Messages = ChatMessages; 