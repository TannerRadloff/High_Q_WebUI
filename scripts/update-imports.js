const fs = require('fs');
const path = require('path');

// Copy the UIArtifact interface to a types file to break circular dependency
const artifactTypesContent = `export interface UIArtifact {
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

export type ArtifactKind = string;
`;

// Write the types file
fs.writeFileSync(
  path.join(process.cwd(), 'src/types/artifact.ts'),
  artifactTypesContent,
  'utf8'
);

// Update the use-artifact.ts file to import from types instead of components
const useArtifactPath = path.join(process.cwd(), 'src/hooks/use-artifact.ts');
let useArtifactContent = fs.readFileSync(useArtifactPath, 'utf8');
useArtifactContent = useArtifactContent.replace(
  "import type { UIArtifact } from '@/components/features/artifact';",
  "import type { UIArtifact } from '@/types/artifact';"
);
fs.writeFileSync(useArtifactPath, useArtifactContent, 'utf8');

// Update the artifact.tsx file to import from types instead
const artifactPath = path.join(process.cwd(), 'src/components/features/artifact.tsx');
let artifactContent = fs.readFileSync(artifactPath, 'utf8');
artifactContent = artifactContent.replace(
  /export interface UIArtifact \{[\s\S]*?\};/,
  "import type { UIArtifact, ArtifactKind } from '@/types/artifact';"
);
artifactContent = artifactContent.replace(
  "export type ArtifactKind = (typeof artifactDefinitions)[number]['kind'];",
  ""
);
fs.writeFileSync(artifactPath, artifactContent, 'utf8');

// Make sure types/index.ts exports all types
const typesIndexPath = path.join(process.cwd(), 'src/types/index.ts');
if (fs.existsSync(typesIndexPath)) {
  let typesIndexContent = fs.readFileSync(typesIndexPath, 'utf8');
  if (!typesIndexContent.includes("export * from './artifact';")) {
    typesIndexContent += "\nexport * from './artifact';\n";
    fs.writeFileSync(typesIndexPath, typesIndexContent, 'utf8');
  }
} else {
  // Create the types index file if it doesn't exist
  fs.writeFileSync(typesIndexPath, "export * from './artifact';\n", 'utf8');
}

console.log("Updated imports to resolve circular dependencies!"); 