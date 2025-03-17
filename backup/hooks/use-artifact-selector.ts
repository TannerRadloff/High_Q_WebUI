'use client';

import { useState, useCallback } from 'react';
import { Artifact } from './use-artifact';

export function useArtifactSelector(initialArtifacts: Artifact[] = []) {
  const [artifacts, setArtifacts] = useState<Artifact[]>(initialArtifacts);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialArtifacts.length > 0 ? initialArtifacts[0].id : null
  );
  const [isLoading, setIsLoading] = useState(false);

  const addArtifact = useCallback((artifact: Artifact) => {
    setArtifacts(prev => [...prev, artifact]);
    return artifact.id;
  }, []);

  const removeArtifact = useCallback((id: string) => {
    setArtifacts(prev => prev.filter(artifact => artifact.id !== id));
    if (selectedId === id) {
      setSelectedId(prev => {
        const remainingArtifacts = artifacts.filter(artifact => artifact.id !== id);
        return remainingArtifacts.length > 0 ? remainingArtifacts[0].id : null;
      });
    }
  }, [artifacts, selectedId]);

  const updateArtifact = useCallback((id: string, updates: Partial<Artifact>) => {
    setArtifacts(prev => 
      prev.map(artifact => 
        artifact.id === id ? { ...artifact, ...updates } : artifact
      )
    );
  }, []);

  const selectArtifact = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const getSelectedArtifact = useCallback(() => {
    return artifacts.find(artifact => artifact.id === selectedId) || null;
  }, [artifacts, selectedId]);

  return {
    artifacts,
    selectedId,
    isLoading,
    setIsLoading,
    addArtifact,
    removeArtifact,
    updateArtifact,
    selectArtifact,
    getSelectedArtifact
  };
} 