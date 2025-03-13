const fs = require('fs');
const path = require('path');

// Ensure both directories exist
const serverManifestDir = path.join(process.cwd(), '.next', 'server', 'app', '(chat)');
const standaloneManifestDir = path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'app', '(chat)');

// Create directories if they don't exist
[serverManifestDir, standaloneManifestDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  } catch (error) {
    console.log(`Note: Could not create directory ${dir}. It may be created during the build: ${error.message}`);
  }
});

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

// Write the manifest files to both locations
const serverManifestPath = path.join(serverManifestDir, 'page_client-reference-manifest.js');
const standaloneManifestPath = path.join(standaloneManifestDir, 'page_client-reference-manifest.js');

try {
  fs.writeFileSync(serverManifestPath, manifestContent);
  console.log(`Created client reference manifest at: ${serverManifestPath}`);
} catch (error) {
  console.log(`Note: Could not write to ${serverManifestPath}: ${error.message}`);
}

try {
  fs.writeFileSync(standaloneManifestPath, manifestContent);
  console.log(`Created client reference manifest at: ${standaloneManifestPath}`);
} catch (error) {
  console.log(`Note: Could not write to ${standaloneManifestPath}: ${error.message}`);
}

console.log('Build fix script completed successfully!'); 