import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

function PureToolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-row items-center justify-between bg-background/80 p-2 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export const Toolbar = memo(PureToolbar); 