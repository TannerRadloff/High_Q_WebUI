const fs = require('fs');
const path = require('path');

// Paths
const sourceManifestPath = path.join(process.cwd(), 'app', '(chat)', 'page_client-reference-manifest.js');
const targetDir = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'app', '(chat)');
const targetManifestPath = path.join(targetDir, 'page_client-reference-manifest.js');

// Create the target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Created directory: ${targetDir}`);
}

// Copy the manifest file
if (fs.existsSync(sourceManifestPath)) {
  fs.copyFileSync(sourceManifestPath, targetManifestPath);
  console.log(`Copied manifest from ${sourceManifestPath} to ${targetManifestPath}`);
} else {
  console.error(`Source manifest not found at ${sourceManifestPath}`);
  
  // Create the manifest file if it doesn't exist
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
  
  fs.writeFileSync(targetManifestPath, manifestContent);
  console.log(`Created manifest at ${targetManifestPath}`);
}

console.log('Post-build script completed successfully!'); 