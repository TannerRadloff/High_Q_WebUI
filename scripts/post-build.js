const fs = require('fs');
const path = require('path');

// Paths for server and standalone manifest
const serverManifestDir = path.join(process.cwd(), '.next', 'server', 'app', '(chat)');
const standaloneManifestDir = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'app', '(chat)');
const serverManifestPath = path.join(serverManifestDir, 'page_client-reference-manifest.js');
const standaloneManifestPath = path.join(standaloneManifestDir, 'page_client-reference-manifest.js');

// Create the client reference manifest content
const manifestContent = `
// This file is needed for Next.js build process
// It provides client reference information for the page
export const clientReferenceManifest = {
  ssrModuleMapping: {},
  edgeSSRModuleMapping: {},
  clientModules: {},
  entryCSSFiles: {}
};
`;

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

// Create both directories if they don't exist
ensureDirectoryExists(serverManifestDir);
ensureDirectoryExists(standaloneManifestDir);

// Write manifest files to both locations
writeManifestFile(serverManifestPath, manifestContent);
writeManifestFile(standaloneManifestPath, manifestContent);

// Copy any other necessary build artifacts
const chatAppDir = path.join(process.cwd(), '.next', 'server', 'app', '(chat)');
const standaloneChatAppDir = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'app', '(chat)');

if (fs.existsSync(chatAppDir)) {
  const files = fs.readdirSync(chatAppDir);
  
  for (const file of files) {
    // Skip the manifest file as we already handled it
    if (file === 'page_client-reference-manifest.js') continue;
    
    const sourcePath = path.join(chatAppDir, file);
    const destPath = path.join(standaloneChatAppDir, file);
    
    if (fs.statSync(sourcePath).isFile()) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied: ${sourcePath} to ${destPath}`);
      } catch (error) {
        console.log(`Warning: Could not copy ${sourcePath} to ${destPath}: ${error.message}`);
      }
    }
  }
}

console.log('Post-build script completed successfully!'); 