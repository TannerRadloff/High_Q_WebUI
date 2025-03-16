import type { ComponentProps } from 'react';

import { type SidebarTrigger, useSidebar } from '@/app/features/sidebar/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/features/tooltip/tooltip';

import { SidebarLeftIcon } from '@/app/features/icons/icons';
import { Button } from '@/app/features/button/button';

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleSidebar}
          variant="outline"
          className="md:px-2 md:h-fit"
        >
          <SidebarLeftIcon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start">Toggle Sidebar</TooltipContent>
    </Tooltip>
  );
}
