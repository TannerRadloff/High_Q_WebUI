/**
 * Hooks Consolidation Script
 * 
 * This script consolidates duplicate hook implementations between
 * src/hooks and app/utils/hooks directories into a canonical location
 * under lib/hooks.
 * 
 * Usage: node scripts/consolidate-hooks.js [--hook HookName]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting hooks consolidation process...');

// Parse command line arguments
const args = process.argv.slice(2);
let specificHook = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--hook' && args[i + 1]) {
    specificHook = args[i + 1];
    break;
  }
}

// Define source directories to check for hooks
const sourceDirs = [
  path.join('src', 'hooks'),
  path.join('app', 'utils', 'hooks')
];

// Define the canonical directory for hooks
const canonicalDir = path.join('lib', 'hooks');

// Get all hook files from a directory
function getHookFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(dir)
      .filter(file => 
        (file.endsWith('.ts') || file.endsWith('.tsx')) && 
        file.startsWith('use-') &&
        file !== 'index.ts' &&
        fs.statSync(path.join(dir, file)).isFile()
      );
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
    return [];
  }
}

// Process a hook file
async function processHook(hookFile) {
  console.log(`\nProcessing hook: ${hookFile}`);
  
  // Check if hook already exists in canonical location
  const canonicalPath = path.join(canonicalDir, hookFile);
  const srcPath = path.join('src', 'hooks', hookFile);
  const appPath = path.join('app', 'utils', 'hooks', hookFile);
  
  // Ensure canonical directory exists
  if (!fs.existsSync(canonicalDir)) {
    console.log(`Creating canonical directory: ${canonicalDir}`);
    fs.mkdirSync(canonicalDir, { recursive: true });
  }
  
  // Check if hook already exists in canonical location
  if (fs.existsSync(canonicalPath)) {
    console.log(`Hook already exists in canonical location: ${canonicalPath}`);
  } else {
    // Copy hook from src or app directory to canonical location
    if (fs.existsSync(srcPath)) {
      console.log(`Copying from src/hooks to canonical location: ${canonicalPath}`);
      fs.copyFileSync(srcPath, canonicalPath);
    } else if (fs.existsSync(appPath)) {
      console.log(`Copying from app/utils/hooks to canonical location: ${canonicalPath}`);
      fs.copyFileSync(appPath, canonicalPath);
    } else {
      console.error(`Hook not found in either src/hooks or app/utils/hooks: ${hookFile}`);
      return { status: 'error', hook: hookFile };
    }
  }
  
  // Update index.ts in canonical directory
  const indexPath = path.join(canonicalDir, 'index.ts');
  const exportLine = `export * from './${hookFile.replace('.ts', '').replace('.tsx', '')}';`;
  
  if (fs.existsSync(indexPath)) {
    const currentContent = fs.readFileSync(indexPath, 'utf8');
    if (!currentContent.includes(exportLine)) {
      console.log(`Updating index.ts at: ${indexPath}`);
      fs.appendFileSync(indexPath, `\n${exportLine}`);
    }
  } else {
    console.log(`Creating index.ts at: ${indexPath}`);
    const indexContent = `/**
 * Hooks
 * 
 * This barrel file exports all custom hooks
 */

${exportLine}
`;
    fs.writeFileSync(indexPath, indexContent);
  }
  
  // Remove hook from src/hooks and app/utils/hooks
  if (fs.existsSync(srcPath) && srcPath !== canonicalPath) {
    console.log(`Removing hook from src/hooks: ${srcPath}`);
    try {
      fs.unlinkSync(srcPath);
    } catch (error) {
      console.error(`Error removing file: ${error.message}`);
    }
  }
  
  if (fs.existsSync(appPath) && appPath !== canonicalPath) {
    console.log(`Removing hook from app/utils/hooks: ${appPath}`);
    try {
      fs.unlinkSync(appPath);
    } catch (error) {
      console.error(`Error removing file: ${error.message}`);
    }
  }
  
  // Update imports throughout the codebase
  await updateImports(hookFile);
  
  return { status: 'success', hook: hookFile };
}

// Update imports throughout the codebase
async function updateImports(hookFile) {
  console.log(`Updating imports for ${hookFile} throughout the codebase...`);
  
  const hookName = hookFile.replace('.ts', '').replace('.tsx', '');
  
  // Use grep to find all imports of this hook
  return new Promise((resolve, reject) => {
    exec(`npx grep-cli -r "from ['\\\"]@\\/hooks\\/${hookName}['\\\"]|from ['\\\"]@\\/src\\/hooks\\/${hookName}['\\\"]|from ['\\\"]@\\/app\\/utils\\/hooks\\/${hookName}['\\\"]" --include="*.{ts,tsx,js,jsx}" ./app ./src ./components`, (error, stdout) => {
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
          
          // Replace imports
          content = content.replace(
            new RegExp(`from ['"]@/hooks/${hookName}['"]`, 'g'),
            `from '@/lib/hooks/${hookName}'`
          );
          
          content = content.replace(
            new RegExp(`from ['"]@/src/hooks/${hookName}['"]`, 'g'),
            `from '@/lib/hooks/${hookName}'`
          );
          
          content = content.replace(
            new RegExp(`from ['"]@/app/utils/hooks/${hookName}['"]`, 'g'),
            `from '@/lib/hooks/${hookName}'`
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

// Update index files
async function updateIndexFiles() {
  // Update src/hooks/index.ts to re-export from lib/hooks
  const srcIndexPath = path.join('src', 'hooks', 'index.ts');
  if (fs.existsSync(srcIndexPath)) {
    console.log(`Updating src/hooks/index.ts to re-export from lib/hooks`);
    const content = `/**
 * Hooks
 * 
 * This file re-exports hooks from the canonical lib/hooks directory
 */

export * from '@/lib/hooks';
`;
    fs.writeFileSync(srcIndexPath, content);
  }
  
  // Update app/utils/hooks/index.ts to re-export from lib/hooks
  const appIndexPath = path.join('app', 'utils', 'hooks', 'index.ts');
  if (fs.existsSync(appIndexPath)) {
    console.log(`Updating app/utils/hooks/index.ts to re-export from lib/hooks`);
    const content = `/**
 * Hooks
 * 
 * This file re-exports hooks from the canonical lib/hooks directory
 */

export * from '@/lib/hooks';
`;
    fs.writeFileSync(appIndexPath, content);
  }
}

async function consolidateHooks() {
  let hooksToProcess = [];
  
  if (specificHook) {
    // Process only the specified hook
    const hookFile = specificHook.endsWith('.ts') || specificHook.endsWith('.tsx') 
      ? specificHook 
      : `${specificHook}.ts`; // Default to .ts extension
    
    hooksToProcess.push(hookFile);
  } else {
    // Find all hooks across directories
    for (const dir of sourceDirs) {
      const hooks = getHookFiles(dir);
      
      for (const hook of hooks) {
        if (!hooksToProcess.includes(hook)) {
          hooksToProcess.push(hook);
        }
      }
    }
  }
  
  console.log(`Found ${hooksToProcess.length} hooks to consolidate`);
  
  // Process each hook
  const results = {
    success: [],
    error: []
  };
  
  for (const hook of hooksToProcess) {
    try {
      const result = await processHook(hook);
      
      if (result.status === 'success') {
        results.success.push(result.hook);
      } else {
        results.error.push(result.hook);
      }
      
      // Small delay to avoid file system race conditions
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing hook ${hook}: ${error.message}`);
      results.error.push(hook);
    }
  }
  
  // Update index files to re-export from lib/hooks
  await updateIndexFiles();
  
  // Print summary
  console.log('\n--- Hooks Consolidation Summary ---');
  console.log(`Hooks found: ${hooksToProcess.length}`);
  console.log(`Successfully consolidated: ${results.success.length}`);
  console.log(`Errors: ${results.error.length}`);
  
  if (results.error.length > 0) {
    console.log('\nHooks with errors:');
    results.error.forEach(hook => console.log(`- ${hook}`));
  }
  
  if (results.success.length > 0) {
    console.log('\nSuccessfully consolidated hooks:');
    results.success.forEach(hook => console.log(`- ${hook}`));
  }
}

// Start the consolidation process
consolidateHooks().catch(error => {
  console.error('Unhandled error during consolidation:', error);
  process.exit(1);
}); 