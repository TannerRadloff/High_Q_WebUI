'use client';

import { useCallback } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language = 'typescript', readOnly = false }: CodeEditorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="relative border rounded-md h-full min-h-[200px]">
      <div className="absolute top-0 right-0 p-2 text-xs text-muted-foreground">
        {language}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        className="w-full h-full min-h-[200px] p-3 font-mono text-sm resize-none focus:outline-none"
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  );
} 