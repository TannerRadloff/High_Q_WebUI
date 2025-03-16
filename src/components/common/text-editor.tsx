'use client';

import { useCallback } from 'react';

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TextEditor({ value, onChange, placeholder = 'Enter text...', readOnly = false }: TextEditorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="w-full h-full min-h-[300px] border rounded-md">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full h-full min-h-[300px] p-4 resize-none focus:outline-none rounded-md"
      />
    </div>
  );
} 