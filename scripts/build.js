const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run the Next.js build
console.log('Running Next.js build...');
try {
  execSync('next build', { stdio: 'inherit' });
  console.log('Next.js build completed successfully!');
} catch (error) {
  console.error('Next.js build failed:', error);
  process.exit(1);
}

// Paths for the client reference manifest
const sourceManifestPath = path.join(process.cwd(), 'app', '(chat)', 'page_client-reference-manifest.js');
const targetDir = path.join(process.cwd(), '.next', 'server', 'app', '(chat)');
const targetManifestPath = path.join(targetDir, 'page_client-reference-manifest.js');

// Create the target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Created directory: ${targetDir}`);
}

// Create the manifest file
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

// Also create the manifest in the standalone directory if it exists
const standaloneDir = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'app', '(chat)');
if (fs.existsSync(path.dirname(standaloneDir))) {
  fs.mkdirSync(standaloneDir, { recursive: true });
  const standaloneManifestPath = path.join(standaloneDir, 'page_client-reference-manifest.js');
  fs.writeFileSync(standaloneManifestPath, manifestContent);
  console.log(`Created manifest at ${standaloneManifestPath}`);
}

console.log('Build script completed successfully!'); 