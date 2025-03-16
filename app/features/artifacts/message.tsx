'use client';

import { useState } from 'react';
import type { Message as AIMessage } from 'ai';
import type { Vote } from '@/lib/db/schema';
import type { ChatRequestOptions } from 'ai';

interface MessageProps {
  message: AIMessage;
  isLoading?: boolean;
  vote?: Vote;
  setMessages: (messages: AIMessage[] | ((messages: AIMessage[]) => AIMessage[])) => void;
  reload: (chatRequestOptions?: ChatRequestOptions) => Promise<string | null | undefined>;
  chatId: string;
  isReadonly: boolean;
}

export function PreviewMessage({
  message,
  isLoading,
  vote,
  setMessages,
  reload,
  chatId,
  isReadonly,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || '');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
  };

  const handleSaveEdit = () => {
    if (editedContent === message.content) {
      setIsEditing(false);
      return;
    }

    setMessages((messages) =>
      messages.map((m) =>
        m.id === message.id ? { ...m, content: editedContent } : m
      )
    );

    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSaveEdit();
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={`w-full flex flex-col ${isUser ? '' : 'items-end'}`}>
      <div
        className={`flex flex-col gap-2 p-4 rounded-lg max-w-full ${
          isUser ? 'bg-background' : 'bg-primary/5'
        }`}
      >
        {isEditing ? (
          <div className="flex flex-col">
            <textarea
              value={editedContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full h-32 p-2 border rounded"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-sm rounded bg-background"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-2 py-1 text-sm rounded bg-primary text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">
            {message.content || ''}
          </div>
        )}
      </div>
    </div>
  );
} 