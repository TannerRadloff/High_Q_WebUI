'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/user-context';
import { ChatMessageData } from '@/lib/supabase';

interface ChatHistoryProps {
  sessionId: string;
  className?: string;
}

export function ChatHistory({ sessionId, className = '' }: ChatHistoryProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat messages when component mounts or session changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Using Supabase directly with RLS
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at');
        
        if (fetchError) throw fetchError;
        
        setMessages(data || []);
      } catch (err: any) {
        console.error('Error fetching chat messages:', err);
        setError(err.message || 'Failed to load chat history');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Set up real-time subscription for chat messages
    if (user) {
      const channel = supabase
        .channel('chat_messages_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessageData;
            setMessages((prev) => [...prev, newMessage]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as ChatMessageData;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedMessage = payload.old as ChatMessageData;
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessage.id));
          }
        })
        .subscribe();
        
      return () => {
        channel.unsubscribe();
      };
    }
  }, [sessionId, user]);

  const addMessage = async (content: string, role: string = 'user') => {
    if (!user) return;
    
    try {
      const newMessage: ChatMessageData = {
        user_id: user.id,
        session_id: sessionId,
        role,
        content
      };
      
      // Insert directly using Supabase client
      const { error } = await supabase
        .from('chat_messages')
        .insert(newMessage);
      
      if (error) throw error;
      
      // The real-time subscription will update the UI
    } catch (err) {
      console.error('Error adding message:', err);
    }
  };
  
  // Format message based on role
  const renderMessage = (message: ChatMessageData) => {
    const isUser = message.role === 'user';
    
    return (
      <div 
        key={message.id} 
        className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}
      >
        <div 
          className={`inline-block p-3 rounded-lg max-w-[80%] ${
            isUser 
              ? 'bg-blue-500 text-white rounded-br-none' 
              : 'bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          {message.content}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {new Date(message.created_at || '').toLocaleTimeString()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="h-10 w-full animate-pulse bg-gray-200 rounded"></div>
        <div className="h-10 w-full animate-pulse bg-gray-200 rounded"></div>
        <div className="h-10 w-full animate-pulse bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className={`overflow-y-auto ${className}`}>
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 p-4">No messages yet</div>
      ) : (
        messages.map(renderMessage)
      )}
    </div>
  );
} 