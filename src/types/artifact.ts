export interface UIArtifact {
  title: string;
  documentId: string;
  kind: string;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

/**
 * Represents the various types of artifacts that can be used in the chat system
 */
export type ArtifactKind = 
  | 'document' 
  | 'image' 
  | 'pdf'
  | 'code'
  | 'video'
  | 'audio'
  | 'link'
  | 'data';

/**
 * Extended properties for artifacts
 */
export interface ArtifactMetadata {
  title?: string;
  description?: string;
  source?: string;
  created?: Date;
  modified?: Date;
  size?: number;
  mimeType?: string;
  author?: string;
  tags?: string[];
  thumbnail?: string;
}
