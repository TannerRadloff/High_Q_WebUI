'use client';

import React, { useState } from 'react';

interface EditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function Editor({
  initialValue = '',
  onChange,
  className = '',
  placeholder = 'Start typing...'
}: EditorProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className={`text-editor-container ${className}`}>
      <textarea
        value={value}
        onChange={handleChange}
        className="text-editor-textarea"
        placeholder={placeholder}
      />
    </div>
  );
} 