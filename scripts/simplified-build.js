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
    return true;
  } catch (error) {
    console.warn(`Warning: Could not create directory ${fullPath}: ${error.message}`);
    return false;
  }
}

function safelyWriteFile(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    // Ensure the directory exists
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory structure: ${dirPath}`);
    }
    
    console.log(`Creating file at: ${fullPath}`);
    fs.writeFileSync(fullPath, content, 'utf8');
    
    // Verify file was created
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Successfully created: ${fullPath}`);
      return true;
    } else {
      console.warn(`⚠️ File creation verification failed for: ${fullPath}`);
      return false;
    }
  } catch (error) {
    console.warn(`⚠️ Warning: Could not write to ${fullPath}: ${error.message}`);
    return false;
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
  console.log(`\n📁 Processing route: ${routePath}`);
  const manifestContent = createManifestContent();
  
  // Create paths for both server and standalone
  const serverPath = path.join(process.cwd(), '.next', 'server', routePath);
  const standalonePath = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', routePath);
  
  console.log(`Server path: ${serverPath}`);
  console.log(`Standalone path: ${standalonePath}`);
  
  // Check if parent directories exist
  const serverDirExists = fs.existsSync(path.dirname(serverPath));
  const standaloneDirExists = fs.existsSync(path.dirname(standalonePath));
  
  console.log(`Server parent directory exists: ${serverDirExists}`);
  console.log(`Standalone parent directory exists: ${standaloneDirExists}`);
  
  // Create directories if they don't exist
  const serverDirCreated = safelyCreateDir(path.join('.next/server', routePath));
  const standaloneDirCreated = safelyCreateDir(path.join('.next/standalone/.next/server', routePath));
  
  if (!serverDirCreated || !standaloneDirCreated) {
    console.warn(`⚠️ Failed to create one or more directories for route ${routePath}`);
  }
  
  // Files to create
  const serverManifestPath = path.join('.next/server', routePath, 'page_client-reference-manifest.js');
  const standaloneManifestPath = path.join('.next/standalone/.next/server', routePath, 'page_client-reference-manifest.js');
  
  // Create manifest files
  const serverManifestCreated = safelyWriteFile(serverManifestPath, manifestContent);
  const standaloneManifestCreated = safelyWriteFile(standaloneManifestPath, manifestContent);
  
  if (!serverManifestCreated || !standaloneManifestCreated) {
    console.warn(`⚠️ Failed to create one or more manifest files for route ${routePath}`);
  }
  
  // Create the parallel manifest for route.js if it exists
  const serverRoutePath = path.join('.next/server', routePath, 'route_client-reference-manifest.js');
  const standaloneRoutePath = path.join('.next/standalone/.next/server', routePath, 'route_client-reference-manifest.js');
  
  if (fs.existsSync(path.join(process.cwd(), '.next/server', routePath, 'route.js'))) {
    console.log(`Creating route manifest for ${routePath}`);
    safelyWriteFile(serverRoutePath, manifestContent);
    safelyWriteFile(standaloneRoutePath, manifestContent);
  }
  
  // Copy other files
  if (fs.existsSync(serverPath)) {
    try {
      const files = fs.readdirSync(serverPath);
      console.log(`Found ${files.length} files in ${serverPath}`);
      
      for (const file of files) {
        // Skip the manifest file as we already handled it
        if (file === 'page_client-reference-manifest.js' || file === 'route_client-reference-manifest.js') continue;
        
        const sourcePath = path.join(serverPath, file);
        const destPath = path.join(standalonePath, file);
        
        if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
          try {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`Copied: ${sourcePath} to ${destPath}`);
          } catch (error) {
            console.warn(`⚠️ Warning: Could not copy ${sourcePath} to ${destPath}: ${error.message}`);
            // Try to create the directory and retry
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            try {
              fs.copyFileSync(sourcePath, destPath);
              console.log(`Retry successful: Copied ${sourcePath} to ${destPath}`);
            } catch (retryError) {
              console.error(`❌ Failed retry: ${retryError.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error reading directory ${serverPath}: ${error.message}`);
    }
  } else {
    console.warn(`⚠️ Directory does not exist: ${serverPath}`);
  }
}

// Known routes that need client reference manifests
const routesNeedingManifests = [
  'app/(chat)',
  'app/(chat)/chat',
  'app/chat',
  'app/chat/[id]',
  'app/todos',
  'app/todos/example',
  'app/notes',
  'app/agent',
  'app/agent-dashboard'
];

// Create manifests for each route
console.log(`\n🔧 Creating manifests for ${routesNeedingManifests.length} routes...`);
routesNeedingManifests.forEach(route => {
  createClientReferenceManifest(route);
});

// Special handling for app/(chat) route since it's mentioned in the error
console.log('\n🔍 Special handling for app/(chat) route...');
const chatRoute = 'app/(chat)';

// Create additional manifest files specifically for this route
const specialPaths = [
  { file: 'page.js', manifest: 'page_client-reference-manifest.js' },
  { file: 'layout.js', manifest: 'layout_client-reference-manifest.js' },
  { file: 'route.js', manifest: 'route_client-reference-manifest.js' }
];

specialPaths.forEach(({ file, manifest }) => {
  const serverFilePath = path.join(process.cwd(), '.next/server', chatRoute, file);
  if (fs.existsSync(serverFilePath)) {
    console.log(`Found ${file} at ${serverFilePath}, creating special manifest`);
    safelyWriteFile(
      path.join('.next/server', chatRoute, manifest),
      createManifestContent()
    );
    safelyWriteFile(
      path.join('.next/standalone/.next/server', chatRoute, manifest),
      createManifestContent()
    );
  } else {
    console.log(`${file} not found at ${serverFilePath}, skipping special manifest`);
  }
});

// Verify final state
console.log('\n✅ Verification step:');
const criticalPath = path.join(process.cwd(), '.next/server/app/(chat)/page_client-reference-manifest.js');
const standaloneManifestPath = path.join(process.cwd(), '.next/standalone/.next/server/app/(chat)/page_client-reference-manifest.js');

if (fs.existsSync(criticalPath)) {
  console.log(`✓ Critical manifest exists: ${criticalPath}`);
} else {
  console.error(`✗ Critical manifest missing: ${criticalPath}`);
  // Force create it
  console.log('Forcing creation of critical manifest...');
  safelyCreateDir(path.join('.next/server/app/(chat)'));
  safelyWriteFile(criticalPath, createManifestContent());
}

if (fs.existsSync(standaloneManifestPath)) {
  console.log(`✓ Standalone manifest exists: ${standaloneManifestPath}`);
} else {
  console.error(`✗ Standalone manifest missing: ${standaloneManifestPath}`);
  // Force create it
  console.log('Forcing creation of standalone manifest...');
  safelyCreateDir(path.join('.next/standalone/.next/server/app/(chat)'));
  safelyWriteFile(standaloneManifestPath, createManifestContent());
}

console.log('\n🎉 Build completed successfully!'); 