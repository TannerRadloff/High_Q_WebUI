/**
 * Pre-build script to fix common issues that might cause build failures
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running build fix script...');

// Ensure required directories exist
const requiredDirs = [
  '.next/server/app/(chat)',
  '.next/standalone/.next/server/app/(chat)'
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Created directory: ${fullPath}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Create empty client reference manifest files if they don't exist
const manifestFiles = [
  '.next/server/app/(chat)/page_client-reference-manifest.js',
  '.next/standalone/.next/server/app/(chat)/page_client-reference-manifest.js'
];

manifestFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Created client reference manifest at: ${fullPath}`);
    fs.writeFileSync(fullPath, '// Auto-generated client reference manifest\n', 'utf8');
  }
});

// Run the import fix script if it exists
try {
  if (fs.existsSync(path.join(process.cwd(), 'scripts/fix-imports.js'))) {
    console.log('Running import path fixer...');
    execSync('node scripts/fix-imports.js', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Error running import fixer:', error);
}

console.log('Build fix script completed successfully!'); 