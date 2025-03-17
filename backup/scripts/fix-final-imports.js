const fs = require('fs');
const path = require('path');

// List of files to update import references
const filesToFix = [
  'src/components/features/artifact.tsx',
  'src/hooks/use-artifact.ts'
];

// Process each file
filesToFix.forEach(filePath => {
  try {
    console.log(`Fixing imports in ${filePath}...`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update imports to use the correct alias paths
    content = content
      .replace(/from ['"]@\/hooks\/use-artifact['"]/g, "from '@/hooks/use-artifact'")
      .replace(/from ['"]@\/types\/artifact['"]/g, "from '@/types/artifact'")
      .replace(/import type \{ UIArtifact(?:, ArtifactKind)? \} from ['"]@\/types\/artifact['"]/g, 
               "import type { UIArtifact, ArtifactKind } from '@/types/artifact'");
    
    // For the hooks file
    if (filePath.includes('use-artifact.ts')) {
      content = content
        .replace(/import type \{ UIArtifact \} from ['"]@\/types\/artifact['"]/g, 
                 "import type { UIArtifact } from '../types/artifact'");
    }
    
    // For the artifact.tsx file
    if (filePath.includes('artifact.tsx')) {
      content = content
        .replace(/import type \{ UIArtifact, ArtifactKind \} from ['"]@\/types\/artifact['"]/g, 
                 "import type { UIArtifact, ArtifactKind } from '../../types/artifact'")
        .replace(/import \{ useArtifact \} from ['"]@\/hooks\/use-artifact['"]/g,
                 "import { useArtifact } from '../../hooks/use-artifact'");
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('All imports fixed successfully!'); 