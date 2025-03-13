'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

// Configuration for Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ChatHomePage() {
  const id = generateUUID();

  // Use cookies function with await as needed in Next.js 15
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // Get the chat model - either from cookie or default
  const chatModel = modelIdFromCookie && 
                   chatModels.some(model => model.id === modelIdFromCookie.value) 
                   ? modelIdFromCookie.value 
                   : DEFAULT_CHAT_MODEL;

  // Simple div wrapper to avoid fragments
  return (
    <div className="flex flex-col h-full">
      <Chat
        id={id}
        initialMessages={[]}
        selectedChatModel={chatModel}
        selectedVisibilityType="private"
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </div>
  );
} 