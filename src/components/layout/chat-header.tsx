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

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background p-2 sm:px-4">
      <div className="flex-1 order-2 md:order-1 flex flex-wrap gap-2 items-center">
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

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
