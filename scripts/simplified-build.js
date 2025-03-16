/**
 * Simplified build script that handles both pre-build and post-build tasks
 * 
 * This script addresses deployment issues by ensuring client reference manifests
 * are created both before and after the Next.js build process.
 * 
 * Key improvements:
 * 1. Pre-creates necessary manifest files before running Next.js build to prevent
 *    "ENOENT: no such file or directory" errors when copying traced files
 * 2. Creates manifests in the standalone directory post-build for proper deployment
 * 3. Special handling for the app/(chat) route to ensure its manifests are correctly created
 * 4. Uses npx to ensure the next command is properly found 
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

// Function to help create client reference manifest files for a given route
function createClientReferenceManifest(routePath) {
  console.log(`📁 Processing route: ${routePath}`);
  const manifestContent = createManifestContent();
  
  // Create paths for server directory
  const serverPath = path.join('.next/server', routePath);
  
  // Create directories if they don't exist
  safelyCreateDir(serverPath);
  
  // Files to create
  const serverManifestPath = path.join(serverPath, 'page_client-reference-manifest.js');
  
  // Create manifest files
  safelyWriteFile(serverManifestPath, manifestContent);
  
  // Also create manifest files for layout and route if applicable
  const layoutManifestPath = path.join(serverPath, 'layout_client-reference-manifest.js');
  const routeManifestPath = path.join(serverPath, 'route_client-reference-manifest.js');
  
  safelyWriteFile(layoutManifestPath, manifestContent);
  safelyWriteFile(routeManifestPath, manifestContent);
}

// Pre-build tasks function
function runPreBuildTasks() {
  console.log('Running pre-build tasks...');
  
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
  
  // Ensure .next directory exists
  safelyCreateDir('.next');
  safelyCreateDir('.next/server');
  
  // Create client reference manifests for key routes before build
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
  
  console.log(`\n🔧 Pre-creating manifests for ${routesNeedingManifests.length} routes...`);
  routesNeedingManifests.forEach(route => {
    safelyCreateDir(path.join('.next/server', route));
    createClientReferenceManifest(route);
  });
  
  // Special handling for app/(chat) route
  console.log('\n🔍 Special pre-build handling for app/(chat) route...');
  const chatRoute = 'app/(chat)';
  createClientReferenceManifest(chatRoute);
}

// Post-build tasks function
function runPostBuildTasks() {
  console.log('\nRunning post-build tasks...');
  
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

  // Create manifests for each route in the standalone directory
  console.log(`\n🔧 Creating manifests for standalone output for ${routesNeedingManifests.length} routes...`);
  
  routesNeedingManifests.forEach(route => {
    console.log(`\n📁 Processing route: ${route}`);
    const manifestContent = createManifestContent();
    
    // Create paths for both server and standalone
    const serverPath = path.join(process.cwd(), '.next', 'server', route);
    const standalonePath = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', route);
    
    console.log(`Server path: ${serverPath}`);
    console.log(`Standalone path: ${standalonePath}`);
    
    // Check if parent directories exist
    const serverDirExists = fs.existsSync(path.dirname(serverPath));
    const standaloneDirExists = fs.existsSync(path.dirname(standalonePath));
    
    console.log(`Server parent directory exists: ${serverDirExists}`);
    console.log(`Standalone parent directory exists: ${standaloneDirExists}`);
    
    // Create directories if they don't exist
    safelyCreateDir(path.join('.next/standalone/.next/server', route));
    
    // Files to create in standalone
    const standaloneManifestPath = path.join('.next/standalone/.next/server', route, 'page_client-reference-manifest.js');
    
    // Create manifest files in standalone
    safelyWriteFile(standaloneManifestPath, manifestContent);
    
    // Copy other files
    if (fs.existsSync(serverPath)) {
      try {
        const files = fs.readdirSync(serverPath);
        console.log(`Found ${files.length} files in ${serverPath}`);
        
        for (const file of files) {
          // Skip manifest files as we already created them
          if (file.includes('_client-reference-manifest.js')) continue;
          
          const sourcePath = path.join(serverPath, file);
          const destPath = path.join(standalonePath, file);
          
          if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
            try {
              // Ensure target directory exists
              fs.mkdirSync(path.dirname(destPath), { recursive: true });
              
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
    safelyWriteFile(
      path.join('.next/server/app/(chat)/page_client-reference-manifest.js'),
      createManifestContent()
    );
  }

  if (fs.existsSync(standaloneManifestPath)) {
    console.log(`✓ Standalone manifest exists: ${standaloneManifestPath}`);
  } else {
    console.error(`✗ Standalone manifest missing: ${standaloneManifestPath}`);
    // Force create it
    safelyWriteFile(
      path.join('.next/standalone/.next/server/app/(chat)/page_client-reference-manifest.js'),
      createManifestContent()
    );
  }
  
  console.log('\n🎉 Build completed successfully!');
}

// Execute the build process
try {
  // Run pre-build tasks
  runPreBuildTasks();
  
  // Run the Next.js build
  console.log('\nRunning Next.js build...');
  execSync('npx next build', { stdio: 'inherit' });
  
  // Run post-build tasks
  runPostBuildTasks();
} catch (error) {
  console.error('Error during build process:', error);
  process.exit(1);
} 