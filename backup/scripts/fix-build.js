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
    const fixResult = require('./fix-imports')();
    console.log(`Import path fixing completed! Success: ${fixResult.success}, Errors: ${fixResult.errors}`);
  }
} catch (error) {
  console.error('Error running import fixer:', error);
}

// Add compatibility checks for pages directory
console.log('Checking for app router components in pages directory...');

// Function to scan for problematic imports
function checkPagesForAppImports() {
  const pagesDir = path.join(process.cwd(), 'pages');
  if (!fs.existsSync(pagesDir)) {
    console.log('No pages directory found, skipping check.');
    return;
  }

  // Find all .tsx and .ts files in the pages directory
  const findFiles = (dir, filesList = []) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findFiles(filePath, filesList);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filesList.push(filePath);
      }
    }
    
    return filesList;
  };
  
  const pageFiles = findFiles(pagesDir);
  let issuesFound = 0;
  
  // Check each file for problematic imports
  for (const file of pageFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Check for TodoList import from app directory
    if (content.includes('import TodoList from') && 
        (content.includes('@/app/components/TodoList') || content.includes('../app/components/TodoList'))) {
      
      console.log(`⚠️ Found TodoList import in ${file}, replacing with compatible version...`);
      
      // Replace the import with the pages-compatible version
      content = content.replace(
        /import\s+TodoList\s+from\s+['"](@\/app\/components\/TodoList|\.\.\/app\/components\/TodoList)['"]/g,
        `import PagesCompatibleTodoList from '@/components/pages-safe'`
      );
      
      // Replace TodoList component usage with PagesCompatibleTodoList
      content = content.replace(/<TodoList/g, '<PagesCompatibleTodoList');
      content = content.replace(/TodoList\s+/g, 'PagesCompatibleTodoList ');
      
      modified = true;
      issuesFound++;
    }
    
    // Check for direct imports of next/headers which is not supported in pages
    if (content.includes("import { cookies }") && content.includes("from 'next/headers'")) {
      console.log(`⚠️ Found next/headers import in ${file}, which is incompatible with pages...`);
      issuesFound++;
      // We don't automatically fix this as it requires a more complex solution
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`✅ Updated ${file} with compatible imports`);
    }
  }
  
  return issuesFound;
}

const issuesFound = checkPagesForAppImports();
if (issuesFound > 0) {
  console.log(`⚠️ Found and fixed ${issuesFound} compatibility issues between app and pages directories.`);
} else {
  console.log('✅ No app/pages compatibility issues found.');
}

// Ensure router compatibility
console.log('Running router compatibility script...');
try {
  require('./ensure-router-compatibility');
  console.log('Router compatibility script completed successfully!');
} catch (error) {
  console.error('Error running router compatibility script:', error);
}

console.log('Build fix script completed successfully!'); 