'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ImageEditorProps {
  content: string;
  isCurrentVersion?: boolean;
}

export function ImageEditor({ content, isCurrentVersion = true }: ImageEditorProps) {
  return (
    <div
      className={cn('w-full p-4 flex justify-center', {
        'opacity-70': !isCurrentVersion,
      })}
    >
      {content && (
        <div className="relative max-w-full">
          <img
            src={content}
            alt="Document preview"
            className="max-w-full h-auto"
          />
        </div>
      )}
    </div>
  );
} 