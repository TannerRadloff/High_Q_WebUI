/**
 * Pre-build script to fix common issues that might cause build failures
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Running build fix script...');

// Set up the NEXT_PUBLIC_APP_URL environment variable if VERCEL_URL is available
if (process.env.VERCEL_URL) {
  console.log(`Setting NEXT_PUBLIC_APP_URL from VERCEL_URL: ${process.env.VERCEL_URL}`);
  
  try {
    // Create or update .env.local file
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envVarLine = `NEXT_PUBLIC_APP_URL=https://${process.env.VERCEL_URL}\n`;
    
    if (fs.existsSync(envLocalPath)) {
      // Check if the variable is already set
      const envContents = fs.readFileSync(envLocalPath, 'utf8');
      if (!envContents.includes('NEXT_PUBLIC_APP_URL=')) {
        // Append to existing file
        fs.appendFileSync(envLocalPath, envVarLine);
        console.log('Added NEXT_PUBLIC_APP_URL to .env.local');
      } else {
        console.log('NEXT_PUBLIC_APP_URL already set in .env.local');
      }
    } else {
      // Create new file
      fs.writeFileSync(envLocalPath, envVarLine);
      console.log('Created .env.local with NEXT_PUBLIC_APP_URL');
    }
  } catch (error) {
    console.warn(`Warning: Failed to set NEXT_PUBLIC_APP_URL: ${error.message}`);
  }
}

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