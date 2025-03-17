'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SpreadsheetEditorProps {
  content: string;
  isCurrentVersion?: boolean;
}

export function SpreadsheetEditor({ content, isCurrentVersion = true }: SpreadsheetEditorProps) {
  return (
    <div
      className={cn('w-full p-4', {
        'opacity-70': !isCurrentVersion,
      })}
    >
      <pre className="overflow-auto">
        <code>{content}</code>
      </pre>
    </div>
  );
} 