'use client';

import { useState, useCallback } from 'react';

export interface Artifact {
  id: string;
  type: 'code' | 'text' | 'image' | 'sheet';
  content: string;
  title?: string;
  metadata?: Record<string, any>;
  versions?: string[];
  currentVersion?: string;
}

export function useArtifact(initialArtifact?: Partial<Artifact>) {
  const [artifact, setArtifact] = useState<Artifact>({
    id: initialArtifact?.id || crypto.randomUUID(),
    type: initialArtifact?.type || 'text',
    content: initialArtifact?.content || '',
    title: initialArtifact?.title || 'Untitled',
    metadata: initialArtifact?.metadata || {},
    versions: initialArtifact?.versions || ['latest'],
    currentVersion: initialArtifact?.currentVersion || 'latest'
  });

  const [isOpen, setIsOpen] = useState(false);

  const updateArtifact = useCallback((updates: Partial<Artifact>) => {
    setArtifact(prev => ({ ...prev, ...updates }));
  }, []);

  const updateContent = useCallback((content: string) => {
    setArtifact(prev => ({ ...prev, content }));
  }, []);

  const openArtifact = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeArtifact = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setVersion = useCallback((version: string) => {
    setArtifact(prev => ({ ...prev, currentVersion: version }));
  }, []);

  return {
    artifact,
    isOpen,
    updateArtifact,
    updateContent,
    openArtifact,
    closeArtifact,
    setVersion
  };
} 