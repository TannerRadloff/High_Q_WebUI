'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/app/features/button/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/features/dropdown-menu/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/features/tooltip/tooltip';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { agentTypeConfig } from '@/src/config/agent-types';

import { CheckCircleFillIcon, ChevronDownIcon, InfoIcon, BotIcon } from '@/app/features/icons/icons';

export type ModelSelectorMode = 'chat-model' | 'agent-type';

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  tooltip?: string;
}

export interface AIModelSelectorProps {
  selectedModelId: string;
  className?: string;
  mode: ModelSelectorMode;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  buttonSize?: 'default' | 'sm';
}

export function AIModelSelector({
  selectedModelId,
  className,
  mode = 'chat-model',
  onSelect,
  disabled = false,
  buttonSize = 'default',
}: AIModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  // Choose the right model options based on mode
  const modelOptions: ModelOption[] = useMemo(() => {
    if (mode === 'agent-type') {
      return agentTypeConfig.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        icon: <BotIcon size={16} />,
      }));
    } else {
      return chatModels.map(model => {
        const isO1Model = model.id === 'gpt-o1';
        return {
          id: model.id,
          name: model.name,
          description: model.description,
          tooltip: isO1Model ? 'GPT-o1 is an advanced model that is currently only available to specific OpenAI customers. If you don\'t have access, the system will automatically fall back to GPT-4o.' : undefined,
        };
      });
    }
  }, [mode]);
  
  // Validate that the selected model exists in the options array
  const validModelId = useMemo(() => {
    return modelOptions.some(model => model.id === optimisticModelId) 
      ? optimisticModelId 
      : modelOptions[0].id;
  }, [optimisticModelId, modelOptions]);

  const selectedModel = useMemo(
    () => modelOptions.find((model) => model.id === validModelId) || modelOptions[0],
    [validModelId, modelOptions],
  );
  
  const handleSelect = (id: string) => {
    setOpen(false);
    
    if (mode === 'chat-model') {
      console.log(`[MODEL-SELECTOR] User selected model: ${id}`);
      
      // Add extra logging for o1 model
      if (id === 'gpt-o1') {
        console.log(`[MODEL-SELECTOR] User selected GPT-o1 model`);
      }

      startTransition(() => {
        setOptimisticModelId(id);
        saveChatModelAsCookie(id);
      });
    } else {
      console.log(`[AGENT-SELECTOR] User selected agent: ${id}`);
    }
    
    // Call custom onSelect handler if provided
    if (onSelect) {
      onSelect(id);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
        disabled={disabled}
      >
        <Button 
          variant="outline" 
          className={cn(
            buttonSize === 'sm' ? 'md:px-2 md:h-[34px]' : '',
            'flex items-center gap-1'
          )}
        >
          {selectedModel.icon}
          <span className="max-w-32 truncate">{selectedModel?.name}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {modelOptions.map((model) => {
          const { id, name, description, tooltip } = model;
          const hasTooltip = !!tooltip;

          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => handleSelect(id)}
              className="gap-4 group/item flex flex-row justify-between items-center"
              data-active={id === validModelId}
            >
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-1">
                  {model.icon}
                  <span className="truncate">{name}</span>
                  {hasTooltip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            <InfoIcon />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p>{tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {description}
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

// Legacy export for backward compatibility
export const ModelSelector = AIModelSelector;
