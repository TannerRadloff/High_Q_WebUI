const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Define the mappings for import path updates
const importMappings = [
  {
    from: 'src/components/layout',
    to: 'components/layout'
  },
  {
    from: 'src/components/ui',
    to: 'components/ui'
  },
  {
    from: 'src/components/common',
    to: 'components/common'
  },
  {
    from: 'src/components/features/chat',
    to: 'app/features/chat/chat'
  },
  {
    from: 'src/components/features/messages',
    to: 'app/features/chat/messages'
  },
  {
    from: 'src/components/features/artifact',
    to: 'app/features/artifacts/artifact'
  },
  {
    from: 'src/components/features/artifact-actions',
    to: 'app/features/artifacts/artifact-actions'
  },
  {
    from: 'src/components/features/document',
    to: 'app/features/documents/document'
  },
  {
    from: 'src/components/features/document-preview',
    to: 'app/features/documents/document-preview'
  }
];

// Find all TypeScript and JavaScript files in the project
const findFiles = () => {
  try {
    // Use a different approach to find files that exist in the project
    const result = execSync('dir /s /b *.ts *.tsx *.js *.jsx', { encoding: 'utf-8' });
    return result.split('\r\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding files:', error);
    return [];
  }
};

// Check if a file exists
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

// Update import paths in a file
const updateImportsInFile = (filePath) => {
  try {
    // Skip if file doesn't exist
    if (!fileExists(filePath)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let updatedContent = content;

    importMappings.forEach(({ from, to }) => {
      // Create a regex to match import statements with the old path
      const importRegex = new RegExp(`from ['"]${from}(?:/[^'"]*)?['"]`, 'g');
      
      // Replace the old path with the new path
      updatedContent = updatedContent.replace(importRegex, (match) => {
        return match.replace(from, to);
      });
    });

    // Write the updated content back to the file if changes were made
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating imports in ${filePath}:`, error);
  }
};

// Main function
const main = () => {
  const files = findFiles();
  console.log(`Found ${files.length} files to process`);
  
  files.forEach(updateImportsInFile);
  
  console.log('Import paths update completed');
};

main();

console.log("Updated imports to resolve circular dependencies!"); 