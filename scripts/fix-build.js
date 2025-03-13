const fs = require('fs');
const path = require('path');

// Ensure the directory exists
const manifestDir = path.join(process.cwd(), '.next', 'server', 'app', '(chat)');
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true });
  console.log(`Created directory: ${manifestDir}`);
}

// Create the client reference manifest file
const manifestPath = path.join(manifestDir, 'page_client-reference-manifest.js');
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

fs.writeFileSync(manifestPath, manifestContent);
console.log(`Created client reference manifest at: ${manifestPath}`); 