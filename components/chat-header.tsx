'use client';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import { UserAuthStatus } from './user-auth-status';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAgentMode } from '@/hooks/use-agent-mode';

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
  const { agentMode, toggleAgentMode } = useAgentMode();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 chat-header">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0 hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {/* Agent Mode Toggle */}
      <div className="order-1 md:order-4 flex items-center gap-2">
        <Switch
          id="agent-mode"
          checked={agentMode}
          onCheckedChange={toggleAgentMode}
          className="data-[state=checked]:bg-primary"
        />
        <Label htmlFor="agent-mode" className="text-sm cursor-pointer">
          Agent Mode
        </Label>
      </div>

      <div className="ml-auto order-3 md:order-5">
        <UserAuthStatus />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
