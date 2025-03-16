'use client';

import { useCallback, useState } from 'react';

interface ConsoleProps {
  output: string;
}

export function Console({ output }: ConsoleProps) {
  return (
    <div className="bg-black text-white p-4 rounded-md font-mono text-sm overflow-auto max-h-[300px]">
      <pre>{output || 'No output'}</pre>
    </div>
  );
} 