'use client';
// @ts-ignore
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/src/components/features/model-selector';
import { SidebarToggle } from '@/src/components/layout/sidebar-toggle';
import { Button } from '@/src/components/ui/button';
import { PlusIcon, BotIcon } from '@/src/components/common/icons';
import { useSidebar } from '@/src/components/ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { type VisibilityType, VisibilitySelector } from '@/src/components/features/visibility-selector';
import { UserAuthStatus } from '@/src/components/auth/user-auth-status';

function ChatHeaderComponent({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  isLoading,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  // Default title for new chats
  const title = chatId === 'create-new' ? 'New Chat' : '';

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <h1 className="text-lg font-semibold flex items-center">
            {title || "New Chat"}
            {isLoading && (
              <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            )}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {windowWidth < 768 && (
          <div className="md:hidden">
            <SidebarToggle />
          </div>
        )}
        
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
        
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      </div>

      {/* Button to create a new chat */}
      {!isReadonly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-3"
              onClick={() => router.push('/')}
              aria-label="Create new chat"
            >
              <PlusIcon />
              <span className="sr-only md:not-sr-only md:ml-2">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start a new chat</TooltipContent>
        </Tooltip>
      )}

      <div className="ml-auto order-3 md:order-5">
        <UserAuthStatus />
      </div>
    </header>
  );
}

export const ChatHeader = memo(ChatHeaderComponent, (prevProps, nextProps) => {
  // Only re-render if selectedModelId or loading state changes
  return prevProps.selectedModelId === nextProps.selectedModelId && 
         prevProps.isLoading === nextProps.isLoading;
});
