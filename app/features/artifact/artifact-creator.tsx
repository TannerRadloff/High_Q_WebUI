'use client';

import React, { useState } from 'react';

interface ArtifactCreatorProps {
  onCreateArtifact: (artifact: {
    type: 'code' | 'text' | 'image' | 'sheet';
    title: string;
    content: string;
  }) => void;
  isLoading?: boolean;
}

export function ArtifactCreator({ onCreateArtifact, isLoading = false }: ArtifactCreatorProps) {
  const [type, setType] = useState<'code' | 'text' | 'image' | 'sheet'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateArtifact({
      type,
      title: title || 'Untitled',
      content
    });
    setTitle('');
    setContent('');
    setIsOpen(false);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
          className="w-full p-3 text-left flex items-center hover:bg-gray-50 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2 text-blue-500" />
          <span>Create new artifact</span>
        </button>
      ) : (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Create New Artifact</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={isLoading}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="code">Code</option>
                <option value="image">Image</option>
                <option value="sheet">Spreadsheet</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title"
                disabled={isLoading}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'image' ? 'Enter image URL' : 'Enter content'}
                disabled={isLoading}
                rows={5}
                className="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="px-4 py-2 mr-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Simple icon components
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
); 