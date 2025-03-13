import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

// Configuration for Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mark page as React Server Component
export default async function Page() {
  const id = generateUUID();

  // Use await with cookies() as seen in other parts of the app
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // If no cookie or the model doesn't exist in chatModels, use default
  if (!modelIdFromCookie || !chatModels.some(model => model.id === modelIdFromCookie.value)) {
    return (
      <>
        <Chat
          id={id}
          initialMessages={[]}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType="private"
          isReadonly={false}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat 
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie.value}
        selectedVisibilityType="private"
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}


