'use server';

import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

// Configuration for Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Explicitly use server component
export default async function Page() {
  const id = generateUUID();

  // Need to use await with cookies() in NextJS 15
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // If no cookie or the model doesn't exist in chatModels, use default
  const chatModel = modelIdFromCookie && 
                    chatModels.some(model => model.id === modelIdFromCookie.value) 
                    ? modelIdFromCookie.value 
                    : DEFAULT_CHAT_MODEL;

  // Simplified component structure to avoid client reference manifest issues
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


