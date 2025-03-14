'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EditorProps {
  content: string;
  isCurrentVersion?: boolean;
}

export function Editor({ content, isCurrentVersion = true }: EditorProps) {
  return (
    <div
      className={cn('prose dark:prose-invert max-w-none', {
        'opacity-70': !isCurrentVersion,
      })}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
} 