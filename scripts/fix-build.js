/**
 * Pre-build script to fix common issues that might cause build failures
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running build fix script...');

// Helper function to safely create directories and files
function safelyCreateDir(dir) {
  const fullPath = path.join(process.cwd(), dir);
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`Creating directory: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
  } catch (error) {
    console.warn(`Warning: Could not create directory ${fullPath}: ${error.message}`);
  }
}

function safelyWriteFile(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    console.log(`Creating file at: ${fullPath}`);
    fs.writeFileSync(fullPath, content, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not write to ${fullPath}: ${error.message}`);
  }
}

// Ensure required directories exist
const requiredDirs = [
  '.next/server/app/(chat)',
  '.next/standalone/.next/server/app/(chat)',
  'src/types'
];

requiredDirs.forEach(safelyCreateDir);

// Create empty client reference manifest files if they don't exist
const manifestFiles = [
  '.next/server/app/(chat)/page_client-reference-manifest.js',
  '.next/standalone/.next/server/app/(chat)/page_client-reference-manifest.js'
];

manifestFiles.forEach(file => {
  safelyWriteFile(file, '// Auto-generated client reference manifest\n');
});

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