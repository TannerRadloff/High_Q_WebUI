'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { artifactDefinitions } from '@/app/features/artifact/artifact';
import type { ArtifactKind } from '@/types/artifact';
import type { Suggestion } from '@/lib/db/schema';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';

export type DataStreamDelta = {
  type:
    | 'text-delta'
    | 'code-delta'
    | 'sheet-delta'
    | 'image-delta'
    | 'title'
    | 'id'
    | 'suggestion'
    | 'clear'
    | 'finish'
    | 'kind'
    | 'message';
  content: string | Suggestion;
  message?: {
    role: string;
    content: string;
  };
};

export function DataStreamHandler({ id }: { id: string }) {
  // Add a state to prevent automatic submission
  const [shouldSubmit, setShouldSubmit] = useState(false);
  
  const { data: dataStream } = useChat({ 
    id,
    initialInput: "",
    initialMessages: [],
    // Prevent automatic submission of empty query
    api: shouldSubmit ? '/api/agent-query' : undefined
  });
  
  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    console.log('[DataStreamHandler] Data stream updated:', dataStream?.length);
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    console.log('[DataStreamHandler] Processing new deltas:', newDeltas.length);

    (newDeltas as DataStreamDelta[]).forEach((delta: DataStreamDelta) => {
      console.log('[DataStreamHandler] Processing delta:', delta.type);

      // Process artifact tool calls
      if (delta.type === 'message' && delta.message) {
        const content = delta.message.content || '';
        
        // Look for potential artifact markers in text
        if (content.includes('Creating document:') || 
            content.includes('Document created:') ||
            content.includes('Updating document:')) {
          console.log('[DataStreamHandler] Potential artifact found in message');
        }
      }

      const artifactDefinition = artifactDefinitions.find(
        (artifactDefinition) => artifactDefinition.kind === artifact.kind,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: 'streaming' };
        }

        switch (delta.type) {
          case 'id':
            return {
              ...draftArtifact,
              documentId: delta.content as string,
              status: 'streaming',
            };

          case 'title':
            return {
              ...draftArtifact,
              title: delta.content as string,
              status: 'streaming',
            };

          case 'kind':
            return {
              ...draftArtifact,
              kind: delta.content as ArtifactKind,
              status: 'streaming',
            };

          case 'clear':
            return {
              ...draftArtifact,
              content: '',
              status: 'streaming',
            };

          case 'finish':
            return {
              ...draftArtifact,
              status: 'idle',
            };

          default:
            return draftArtifact;
        }
      });
    });
  }, [dataStream, setArtifact, setMetadata, artifact]);

  return null;
}
