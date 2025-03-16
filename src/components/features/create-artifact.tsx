'use client';

import { useState } from 'react';

interface CreateArtifactProps {
  onSubmit: (title: string, kind: string) => void;
  kind?: string;
}

export function CreateArtifact({ onSubmit, kind = 'text' }: CreateArtifactProps) {
  const [title, setTitle] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title, kind);
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter artifact title"
        className="border p-2 rounded-md"
      />
      <button 
        type="submit" 
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
      >
        Create {kind} artifact
      </button>
    </form>
  );
} 