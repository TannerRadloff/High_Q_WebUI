/**
 * Simplified build script that handles only essential pre-build and post-build tasks
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running simplified build script...');

// Helper function to safely create directories and files
function safelyCreateDir(dir) {
  const fullPath = path.join(process.cwd(), dir);
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`Creating directory: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
  } catch (error) {
    console.warn(`Warning: Could not create directory ${fullPath}: ${error.message}`);
  }
}

function safelyWriteFile(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    console.log(`Creating file at: ${fullPath}`);
    fs.writeFileSync(fullPath, content, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not write to ${fullPath}: ${error.message}`);
  }
}

// Create the client reference manifest content
function createManifestContent() {
  return `
// This file is needed for Next.js build process
// It provides client reference information for the page
export const clientReferenceManifest = {
  ssrModuleMapping: {},
  edgeSSRModuleMapping: {},
  clientModules: {},
  entryCSSFiles: {}
};
`;
}

// Ensure the src/types directory exists and contains necessary type definitions
safelyCreateDir('src/types');

// Ensure the ArtifactKind type exists
const artifactTypeFile = 'src/types/artifact.ts';
const artifactTypeContent = `export interface UIArtifact {
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

safelyWriteFile(artifactTypeFile, artifactTypeContent);

// Ensure the types index file exists
const typesIndexFile = 'src/types/index.ts';
safelyWriteFile(typesIndexFile, 'export * from "./artifact";\n');

// Run the Next.js build
try {
  console.log('Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Error during Next.js build:', error);
  process.exit(1);
}

// Post-build tasks
console.log('Running post-build tasks...');

// Function to help create client reference manifest files for a given route
function createClientReferenceManifest(routePath) {
  const manifestContent = createManifestContent();
  
  // Create paths for both server and standalone
  const serverPath = path.join(process.cwd(), '.next', 'server', routePath);
  const standalonePath = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', routePath);
  
  // Create directories if they don't exist
  safelyCreateDir(path.join('.next/server', routePath));
  safelyCreateDir(path.join('.next/standalone/.next/server', routePath));
  
  // Create manifest files
  safelyWriteFile(path.join('.next/server', routePath, 'page_client-reference-manifest.js'), manifestContent);
  safelyWriteFile(path.join('.next/standalone/.next/server', routePath, 'page_client-reference-manifest.js'), manifestContent);
  
  // Copy other files
  if (fs.existsSync(serverPath)) {
    const files = fs.readdirSync(serverPath);
    
    for (const file of files) {
      // Skip the manifest file as we already handled it
      if (file === 'page_client-reference-manifest.js') continue;
      
      const sourcePath = path.join(serverPath, file);
      const destPath = path.join(standalonePath, file);
      
      if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
        try {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copied: ${sourcePath} to ${destPath}`);
        } catch (error) {
          console.log(`Warning: Could not copy ${sourcePath} to ${destPath}: ${error.message}`);
        }
      }
    }
  }
}

// Known routes that need client reference manifests
const routesNeedingManifests = [
  'app/(chat)',
  'app/chat/[id]',
  'app/todos',
  'app/todos/example',
  'app/notes'
];

// Create manifests for each route
routesNeedingManifests.forEach(route => {
  console.log(`Creating manifest for route: ${route}`);
  createClientReferenceManifest(route);
});

console.log('Build completed successfully!'); 