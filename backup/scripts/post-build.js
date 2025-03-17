const fs = require('fs');
const path = require('path');

// Function to create the client reference manifest content
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

// Function to ensure directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      console.log(`Warning: Could not create directory ${dir}: ${error.message}`);
    }
  }
}

// Function to write manifest file
function writeManifestFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    console.log(`Created manifest at: ${filePath}`);
  } catch (error) {
    console.log(`Warning: Could not write to ${filePath}: ${error.message}`);
  }
}

// Function to help create client reference manifest files for a given route
function createClientReferenceManifest(routePath) {
  const manifestContent = createManifestContent();
  
  // Create paths for both server and standalone
  const serverPath = path.join(process.cwd(), '.next', 'server', routePath);
  const standalonePath = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', routePath);
  
  // Create directories if they don't exist
  ensureDirectoryExists(serverPath);
  ensureDirectoryExists(standalonePath);
  
  // Create manifest files
  const serverManifestPath = path.join(serverPath, 'page_client-reference-manifest.js');
  const standaloneManifestPath = path.join(standalonePath, 'page_client-reference-manifest.js');
  
  writeManifestFile(serverManifestPath, manifestContent);
  writeManifestFile(standaloneManifestPath, manifestContent);
  
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

console.log('Post-build script completed successfully!'); 