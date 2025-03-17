/**
 * Utility Functions Consolidation Script
 * 
 * This script consolidates duplicate utility functions across the codebase
 * into a canonical location under lib/utils/functions.
 * 
 * Usage: node scripts/consolidate-utils.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting utility functions consolidation process...');

// Define the canonical directory for utility functions
const canonicalDir = path.join('lib', 'utils', 'functions');

// Define utility functions to consolidate with their source files and implementation regex
const utilityFunctions = [
  {
    name: 'cn',
    description: 'Utility function for combining class names with Tailwind',
    sources: [
      path.join('utils', 'formatting', 'index.ts'),
      path.join('lib', 'utils.ts')
    ],
    // Regex to match the function implementation
    pattern: /export\s+function\s+cn\s*\([\s\S]*?return\s+[\s\S]*?;[\s\S]*?\}/g,
    imports: [
      "import { type ClassValue, clsx } from 'clsx';",
      "import { twMerge } from 'tailwind-merge';"
    ],
    exampleUsage: "cn('px-2', 'py-1', isActive && 'bg-blue-500')"
  },
  {
    name: 'generateUUID',
    description: 'Utility function for generating a UUID',
    sources: [
      path.join('utils', 'auth', 'index.ts'),
      path.join('lib', 'utils.ts')
    ],
    // Regex to match the function implementation
    pattern: /export\s+function\s+generateUUID\s*\(\)[\s\S]*?return\s+[\s\S]*?;[\s\S]*?\}/g,
    imports: [],
    exampleUsage: "generateUUID()"
  }
];

// Ensure canonical directory exists
if (!fs.existsSync(canonicalDir)) {
  console.log(`Creating canonical directory: ${canonicalDir}`);
  fs.mkdirSync(canonicalDir, { recursive: true });
}

// Extract function implementation from a file
function extractFunctionImplementation(filePath, pattern) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(pattern);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

// Consolidate a single utility function
async function consolidateUtilFunction(utilFunction) {
  console.log(`\nConsolidating utility function: ${utilFunction.name}`);
  
  // Find the function implementation in source files
  let implementation = null;
  let sourceFile = null;
  
  for (const source of utilFunction.sources) {
    const extracted = extractFunctionImplementation(source, utilFunction.pattern);
    if (extracted) {
      implementation = extracted;
      sourceFile = source;
      console.log(`Found implementation in: ${source}`);
      break;
    }
  }
  
  if (!implementation) {
    console.error(`Could not find implementation for ${utilFunction.name} in any source files`);
    return { status: 'error', function: utilFunction.name };
  }
  
  // Create the canonical file for the utility function
  const canonicalFile = path.join(canonicalDir, `${utilFunction.name}.ts`);
  
  const fileContent = `/**
 * ${utilFunction.description}
 * 
 * Example usage: ${utilFunction.exampleUsage}
 */

${utilFunction.imports.join('\n')}

${implementation}
`;

  console.log(`Writing function to canonical location: ${canonicalFile}`);
  fs.writeFileSync(canonicalFile, fileContent);
  
  // Update index.ts in canonical directory
  const indexPath = path.join(canonicalDir, 'index.ts');
  const exportLine = `export * from './${utilFunction.name}';`;
  
  if (fs.existsSync(indexPath)) {
    const currentContent = fs.readFileSync(indexPath, 'utf8');
    if (!currentContent.includes(exportLine)) {
      console.log(`Updating index.ts at: ${indexPath}`);
      fs.appendFileSync(indexPath, `\n${exportLine}`);
    }
  } else {
    console.log(`Creating index.ts at: ${indexPath}`);
    const indexContent = `/**
 * Utility Functions
 * 
 * This barrel file exports all utility functions
 */

${exportLine}
`;
    fs.writeFileSync(indexPath, indexContent);
  }
  
  // Create root utils/index.ts to re-export all utility functions
  const rootUtilsPath = path.join('lib', 'utils', 'index.ts');
  if (!fs.existsSync(path.join('lib', 'utils'))) {
    fs.mkdirSync(path.join('lib', 'utils'), { recursive: true });
  }
  
  if (fs.existsSync(rootUtilsPath)) {
    const currentContent = fs.readFileSync(rootUtilsPath, 'utf8');
    if (!currentContent.includes(`export * from './functions';`)) {
      console.log(`Updating lib/utils/index.ts to export utility functions`);
      fs.appendFileSync(rootUtilsPath, `\n// Export all utility functions\nexport * from './functions';\n`);
    }
  } else {
    console.log(`Creating lib/utils/index.ts to export utility functions`);
    const indexContent = `/**
 * Utility Functions
 * 
 * This barrel file exports all utility modules
 */

// Export all utility functions
export * from './functions';
`;
    fs.writeFileSync(rootUtilsPath, indexContent);
  }
  
  // Update imports throughout the codebase
  await updateImports(utilFunction.name);
  
  return { status: 'success', function: utilFunction.name };
}

// Update imports throughout the codebase
async function updateImports(functionName) {
  console.log(`Updating imports for ${functionName} throughout the codebase...`);
  
  // Use grep to find all imports of this function
  return new Promise((resolve, reject) => {
    exec(`npx grep-cli -r "import.*${functionName}.*from ['\\\"]@" --include="*.{ts,tsx,js,jsx}" ./app ./src ./components ./utils ./lib`, (error, stdout) => {
      if (error && error.code !== 1) { // grep returns 1 if no matches
        console.error(`Error searching for imports: ${error.message}`);
        reject(error);
        return;
      }
      
      const filesToUpdate = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => line.split(':')[0])
        .filter((file, index, self) => self.indexOf(file) === index); // Remove duplicates
      
      console.log(`Found ${filesToUpdate.length} files with imports to update`);
      
      for (const file of filesToUpdate) {
        try {
          let content = fs.readFileSync(file, 'utf8');
          
          // Replace imports from various locations to the canonical location
          content = content.replace(
            new RegExp(`(import\\s+\\{[^}]*?)(\\b${functionName}\\b)([^}]*?\\}\\s+from\\s+['"])@/utils/formatting(['"])`, 'g'),
            `$1$2$3@/lib/utils/functions$4`
          );
          
          content = content.replace(
            new RegExp(`(import\\s+\\{[^}]*?)(\\b${functionName}\\b)([^}]*?\\}\\s+from\\s+['"])@/utils/auth(['"])`, 'g'),
            `$1$2$3@/lib/utils/functions$4`
          );
          
          content = content.replace(
            new RegExp(`(import\\s+\\{[^}]*?)(\\b${functionName}\\b)([^}]*?\\}\\s+from\\s+['"])@/lib/utils(['"])`, 'g'),
            `$1$2$3@/lib/utils/functions$4`
          );
          
          // Replace any other potential import paths
          content = content.replace(
            new RegExp(`(import\\s+\\{[^}]*?)(\\b${functionName}\\b)([^}]*?\\}\\s+from\\s+['"])@/utils(['"])`, 'g'),
            `$1$2$3@/lib/utils/functions$4`
          );
          
          fs.writeFileSync(file, content);
          console.log(`Updated imports in: ${file}`);
        } catch (error) {
          console.error(`Error updating file ${file}: ${error.message}`);
        }
      }
      
      resolve();
    });
  });
}

// Find all files that import from util locations
async function findAndUpdateAllImports() {
  console.log(`Scanning the codebase for util imports that need updating...`);
  
  return new Promise((resolve, reject) => {
    exec(`npx grep-cli -r "import.*from ['\\\"]@\\/utils\\/formatting['\\\"]|import.*from ['\\\"]@\\/utils\\/auth['\\\"]|import.*from ['\\\"]@\\/lib\\/utils['\\\"]" --include="*.{ts,tsx,js,jsx}" ./app ./src ./components ./utils ./lib`, (error, stdout) => {
      if (error && error.code !== 1) { // grep returns 1 if no matches
        console.error(`Error searching for imports: ${error.message}`);
        reject(error);
        return;
      }
      
      const filesToUpdate = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => line.split(':')[0])
        .filter((file, index, self) => self.indexOf(file) === index); // Remove duplicates
      
      console.log(`Found ${filesToUpdate.length} files with util imports that might need updating`);
      
      resolve(filesToUpdate);
    });
  });
}

// Main function to consolidate all utility functions
async function consolidateUtils() {
  const results = {
    success: [],
    error: []
  };
  
  // Process each utility function
  for (const utilFunction of utilityFunctions) {
    try {
      const result = await consolidateUtilFunction(utilFunction);
      
      if (result.status === 'success') {
        results.success.push(result.function);
      } else {
        results.error.push(result.function);
      }
      
      // Small delay to avoid file system race conditions
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing utility function ${utilFunction.name}: ${error.message}`);
      results.error.push(utilFunction.name);
    }
  }
  
  // Find and update all remaining imports
  const filesWithUtilImports = await findAndUpdateAllImports();
  
  // Print summary
  console.log('\n--- Utility Functions Consolidation Summary ---');
  console.log(`Utility functions processed: ${utilityFunctions.length}`);
  console.log(`Successfully consolidated: ${results.success.length}`);
  console.log(`Errors: ${results.error.length}`);
  console.log(`Files checked for import updates: ${filesWithUtilImports.length}`);
  
  if (results.error.length > 0) {
    console.log('\nUtility functions with errors:');
    results.error.forEach(fn => console.log(`- ${fn}`));
  }
  
  if (results.success.length > 0) {
    console.log('\nSuccessfully consolidated utility functions:');
    results.success.forEach(fn => console.log(`- ${fn}`));
  }
}

// Start the consolidation process
consolidateUtils().catch(error => {
  console.error('Unhandled error during consolidation:', error);
  process.exit(1);
}); 