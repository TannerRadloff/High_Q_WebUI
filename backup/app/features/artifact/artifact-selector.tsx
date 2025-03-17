'use client';

import React, { useState } from 'react';

interface ArtifactSelectorProps {
  artifacts: Array<{
    id: string;
    type: 'code' | 'text' | 'image' | 'sheet';
    content: string;
    title?: string;
    metadata?: Record<string, any>;
    versions?: string[];
    currentVersion?: string;
  }>;
  onSelect?: (artifactId: string) => void;
  selectedId?: string;
  isLoading?: boolean;
}

export function ArtifactSelector({
  artifacts,
  onSelect,
  selectedId,
  isLoading = false
}: ArtifactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArtifacts = artifacts.filter(artifact => 
    artifact.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    artifact.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Artifacts</h3>
        <input
          type="text"
          placeholder="Search artifacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>
      
      <div className="flex-1 overflow-auto max-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredArtifacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No artifacts found
          </div>
        ) : (
          <ul className="divide-y">
            {filteredArtifacts.map(artifact => (
              <li 
                key={artifact.id}
                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === artifact.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelect?.(artifact.id)}
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {artifact.type === 'code' && (
                      <CodeIcon className="h-5 w-5 text-blue-500" />
                    )}
                    {artifact.type === 'text' && (
                      <TextIcon className="h-5 w-5 text-green-500" />
                    )}
                    {artifact.type === 'image' && (
                      <ImageIcon className="h-5 w-5 text-purple-500" />
                    )}
                    {artifact.type === 'sheet' && (
                      <SheetIcon className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{artifact.title || 'Untitled'}</h4>
                    <p className="text-sm text-gray-500 capitalize">{artifact.type}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Simple icon components
const CodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const TextIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const SheetIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
); 