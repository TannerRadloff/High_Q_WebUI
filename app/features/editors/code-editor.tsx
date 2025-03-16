'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  content: string;
  isCurrentVersion?: boolean;
}

export function CodeEditor({ content, isCurrentVersion = true }: CodeEditorProps) {
  return (
    <pre
      className={cn('p-4 overflow-auto', {
        'opacity-70': !isCurrentVersion,
      })}
    >
      <code>{content}</code>
    </pre>
  );
} 