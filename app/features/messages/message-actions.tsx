import type { Message } from 'ai';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';
import { notifications } from '@/lib/api-error-handler';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from '@/src/components/common/icons';
import { Button } from '@/src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { memo } from 'react';
import equal from 'fast-deep-equal';

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;
  if (message.role === 'user') return null;
  if (message.toolInvocations && message.toolInvocations.length > 0)
    return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                await copyToClipboard(message.content as string);
                notifications.success('Copied to clipboard!', { id: 'copy-message' });
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              disabled={vote?.isUpvoted}
              variant="outline"
              onClick={() => {
                const upvotePromise = fetch('/api/vote', {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    isUpvoted: true,
                  }),
                }).then(() => {
                  mutate(`/api/vote?chatId=${chatId}`);
                });

                notifications.promise(upvotePromise, {
                  loading: 'Saving your feedback...',
                  success: 'Feedback received! Thanks for helping us improve.',
                  error: 'Failed to save feedback. Please try again.',
                  id: `upvote-${message.id}`
                });
              }}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              variant="outline"
              disabled={vote?.isUpvoted === false}
              onClick={() => {
                const downvotePromise = fetch('/api/vote', {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    isUpvoted: false,
                  }),
                }).then(() => {
                  mutate(`/api/vote?chatId=${chatId}`);
                });

                notifications.promise(downvotePromise, {
                  loading: 'Saving your feedback...',
                  success: 'Feedback received. We\'ll use this to improve.',
                  error: 'Failed to save feedback. Please try again.',
                  id: `downvote-${message.id}`
                });
              }}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
