'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Artifact, ArtifactSelector, ArtifactCreator } from '@/app/features/artifact';
import { useArtifact } from '@/hooks/use-artifact';
import dynamic from 'next/dynamic';

// Define the Artifact type locally
interface ArtifactType {
  id: string;
  type: 'code' | 'text' | 'image' | 'sheet';
  content: string;
  title?: string;
  metadata?: Record<string, any>;
  versions?: string[];
  currentVersion?: string;
}

// Create a client-side only component to avoid SSR issues
const ArtifactsPage = () => {
  // Initial artifacts
  const initialArtifacts: ArtifactType[] = [
    {
      id: '1',
      type: 'text',
      content: 'This is a sample text artifact.',
      title: 'Sample Text',
      versions: ['latest'],
      currentVersion: 'latest'
    },
    {
      id: '2',
      type: 'code',
      content: 'function hello() {\n  console.log("Hello, world!");\n}',
      title: 'Sample Code',
      versions: ['latest'],
      currentVersion: 'latest'
    }
  ];

  // State management
  const [artifacts, setArtifacts] = useState<ArtifactType[]>(initialArtifacts);
  const [selectedId, setSelectedId] = useState<string>(initialArtifacts[0].id);
  const [isLoading, setIsLoading] = useState(false);

  // Get the selected artifact
  const selectedArtifact = artifacts.find(artifact => artifact.id === selectedId);

  // Handlers
  const handleContentChange = (content: string) => {
    if (selectedId) {
      setArtifacts(prev => 
        prev.map(artifact => 
          artifact.id === selectedId ? { ...artifact, content } : artifact
        )
      );
    }
  };

  const handleVersionChange = (version: string) => {
    if (selectedId) {
      setArtifacts(prev => 
        prev.map(artifact => 
          artifact.id === selectedId ? { ...artifact, currentVersion: version } : artifact
        )
      );
    }
  };

  const selectArtifact = (id: string) => {
    setSelectedId(id);
  };

  const handleCreateArtifact = (newArtifact: {
    type: 'code' | 'text' | 'image' | 'sheet';
    title: string;
    content: string;
  }) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newId = crypto.randomUUID();
      const artifactToAdd = {
        id: newId,
        ...newArtifact,
        versions: ['latest'],
        currentVersion: 'latest'
      };
      
      setArtifacts(prev => [...prev, artifactToAdd]);
      setSelectedId(newId);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Artifacts Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <ArtifactCreator 
            onCreateArtifact={handleCreateArtifact}
            isLoading={isLoading}
          />
          
          <ArtifactSelector
            artifacts={artifacts}
            selectedId={selectedId}
            onSelect={selectArtifact}
            isLoading={isLoading}
          />
        </div>
        
        <div className="md:col-span-2">
          {selectedArtifact ? (
            <Artifact
              artifact={selectedArtifact}
              onContentChange={handleContentChange}
              onVersionChange={handleVersionChange}
              isLoading={isLoading}
            />
          ) : (
            <div className="border rounded-lg p-6 text-center text-gray-500">
              No artifact selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Use dynamic import with SSR disabled to avoid auth provider issues during build
export default dynamic(() => Promise.resolve(ArtifactsPage), {
  ssr: false
}); 