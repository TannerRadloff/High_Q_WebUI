'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { UIArtifact } from '@/types/artifact';

// Define initial artifact data
export const initialArtifactData: UIArtifact = {
  documentId: 'init',
  content: '',
  title: '',
  kind: 'text',
  status: 'idle',
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0
  }
};

// Define the type for the artifact metadata
export type ArtifactMetadata = Record<string, any>;

// Define the context type
export interface ArtifactContextType {
  artifact: UIArtifact;
  setArtifact: Dispatch<SetStateAction<UIArtifact>>;
  metadata: ArtifactMetadata;
  setMetadata: Dispatch<SetStateAction<ArtifactMetadata>>;
}

// Create context with default values
export const ArtifactContext = createContext<ArtifactContextType>({
  artifact: initialArtifactData,
  setArtifact: () => {},
  metadata: {},
  setMetadata: () => {},
});

// Custom hook to use the artifact context
export const useArtifact = () => useContext(ArtifactContext);

// Custom hook to select specific properties from the artifact
export const useArtifactSelector = <T>(selector: (artifact: UIArtifact) => T): T => {
  const { artifact } = useArtifact();
  return selector(artifact);
}; 