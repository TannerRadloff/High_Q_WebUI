import { ArtifactKind } from '@/types/artifact';

// Define artifact definitions with their display properties
export const artifactDefinitions: Record<ArtifactKind, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  text: {
    name: 'Text',
    description: 'Plain text content',
    icon: 'FileText',
    color: 'blue',
  },
  code: {
    name: 'Code',
    description: 'Programming code',
    icon: 'Code',
    color: 'green',
  },
  sheet: {
    name: 'Spreadsheet',
    description: 'Tabular data',
    icon: 'Table',
    color: 'purple',
  },
  image: {
    name: 'Image',
    description: 'Generated image',
    icon: 'Image',
    color: 'orange',
  },
};

// Helper function to get artifact definition by kind
export function getArtifactDefinition(kind: ArtifactKind) {
  return artifactDefinitions[kind] || artifactDefinitions.text;
}

// Export the artifact kinds as an array for selection components
export const artifactKinds = Object.keys(artifactDefinitions) as ArtifactKind[]; 