import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const id = generateUUID();
  
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


