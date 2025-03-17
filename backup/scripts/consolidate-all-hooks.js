/**
 * Consolidate All Hooks Script
 * 
 * This script automatically consolidates all hooks from src/hooks to app/utils/hooks
 * and updates imports throughout the codebase.
 * 
 * Usage: node scripts/consolidate-all-hooks.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting hook consolidation process...');

// Get hook files from src/hooks directory
function getHookFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(dir)
      .filter(file => 
        (file.endsWith('.ts') || file.endsWith('.tsx')) && 
        file !== 'index.ts' &&
        fs.statSync(path.join(dir, file)).isFile()
      );
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
    return [];
  }
}

// Convert kebab-case filename to camelCase hook name
function toCamelCase(filename) {
  // Remove file extension
  const name = filename.replace(/\.[^/.]+$/, "");
  
  // Convert kebab-case to camelCase
  return name
    .split('-')
    .map((part, index) => 
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');
}

// Process a single hook
function processHook(hookFile) {
  const hookName = toCamelCase(hookFile);
  
  console.log(`Processing hook: ${hookName} (${hookFile})`);
  
  return new Promise((resolve) => {
    exec(`node scripts/consolidate-hooks.js --hook ${hookName}`, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (error) {
        console.error(`Error consolidating ${hookName}: ${error.message}`);
        console.error(stderr);
        resolve({ status: 'error', hook: hookName, error: error.message });
      } else {
        console.log(`Successfully consolidated ${hookName}`);
        resolve({ status: 'success', hook: hookName });
      }
    });
  });
}

async function consolidateAllHooks() {
  const srcHooksDir = path.join('src', 'hooks');
  const hookFiles = getHookFiles(srcHooksDir);
  
  console.log(`Found ${hookFiles.length} hooks to consolidate`);
  
  // Process each hook
  const results = {
    success: [],
    error: []
  };
  
  for (const hookFile of hookFiles) {
    const result = await processHook(hookFile);
    
    if (result.status === 'success') {
      results.success.push(result.hook);
    } else {
      results.error.push(result.hook);
    }
    
    // Add a small delay between hooks to avoid file system race conditions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log('\n--- Hook Consolidation Summary ---');
  console.log(`Hooks found: ${hookFiles.length}`);
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
consolidateAllHooks().catch(error => {
  console.error('Unhandled error during consolidation:', error);
  process.exit(1);
}); 