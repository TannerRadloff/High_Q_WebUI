'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon, InfoIcon } from '@/src/components/common/icons';

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  // Validate that the selected model exists in the chatModels array
  const validModelId = useMemo(() => {
    return chatModels.some(model => model.id === optimisticModelId) 
      ? optimisticModelId 
      : chatModels[0].id;
  }, [optimisticModelId]);

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === validModelId) || chatModels[0],
    [validModelId],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {chatModels.map((chatModel) => {
          const { id } = chatModel;
          const isO1Model = id === 'gpt-o1';

          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                setOpen(false);

                console.log(`[MODEL-SELECTOR] User selected model: ${id}`);
                
                // Add extra logging for o1 model
                if (isO1Model) {
                  console.log(`[MODEL-SELECTOR] User selected GPT-o1 model`);
                }

                startTransition(() => {
                  setOptimisticModelId(id);
                  saveChatModelAsCookie(id);
                });
              }}
              className="gap-4 group/item flex flex-row justify-between items-center"
              data-active={id === validModelId}
            >
              <div className="flex flex-col gap-1 items-start">
                <div className="flex items-center gap-1">
                  {chatModel.name}
                  {isO1Model && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            <InfoIcon />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p>GPT-o1 is an advanced model that is currently only available to specific OpenAI customers. If you don&apos;t have access, the system will automatically fall back to GPT-4o.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {chatModel.description}
                </div>
              </div>

              <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
