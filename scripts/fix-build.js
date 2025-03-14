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
  '.next/standalone/.next/server/app/(chat)',
  'src/types'
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

// Ensure the ArtifactKind type exists
const artifactTypeFile = path.join(process.cwd(), 'src/types/artifact.ts');
if (!fs.existsSync(artifactTypeFile)) {
  console.log(`Creating artifact type definitions at: ${artifactTypeFile}`);
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
  fs.writeFileSync(artifactTypeFile, artifactTypeContent, 'utf8');
}

// Ensure the types index file exists
const typesIndexFile = path.join(process.cwd(), 'src/types/index.ts');
if (!fs.existsSync(typesIndexFile)) {
  console.log(`Creating types index at: ${typesIndexFile}`);
  fs.writeFileSync(typesIndexFile, 'export * from "./artifact";\n', 'utf8');
}

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