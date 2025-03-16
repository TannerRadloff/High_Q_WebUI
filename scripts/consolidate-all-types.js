/**
 * Consolidate All Types Script
 * 
 * This script automatically consolidates all types from src/types to the root types directory
 * and updates imports throughout the codebase.
 * 
 * Usage: node scripts/consolidate-all-types.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting type consolidation process...');

// Get type files from src/types directory
function getTypeFiles(dir) {
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

// Process a single type
function processType(typeFile) {
  // Remove file extension
  const typeName = typeFile.replace(/\.[^/.]+$/, "");
  
  console.log(`Processing type: ${typeName} (${typeFile})`);
  
  return new Promise((resolve) => {
    exec(`node scripts/consolidate-types.js --type ${typeName}`, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (error) {
        console.error(`Error consolidating ${typeName}: ${error.message}`);
        console.error(stderr);
        resolve({ status: 'error', type: typeName, error: error.message });
      } else {
        console.log(`Successfully consolidated ${typeName}`);
        resolve({ status: 'success', type: typeName });
      }
    });
  });
}

async function consolidateAllTypes() {
  const srcTypesDir = path.join('src', 'types');
  const typeFiles = getTypeFiles(srcTypesDir);
  
  console.log(`Found ${typeFiles.length} types to consolidate`);
  
  // Process each type
  const results = {
    success: [],
    error: []
  };
  
  for (const typeFile of typeFiles) {
    const result = await processType(typeFile);
    
    if (result.status === 'success') {
      results.success.push(result.type);
    } else {
      results.error.push(result.type);
    }
    
    // Add a small delay between types to avoid file system race conditions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log('\n--- Type Consolidation Summary ---');
  console.log(`Types found: ${typeFiles.length}`);
  console.log(`Successfully consolidated: ${results.success.length}`);
  console.log(`Errors: ${results.error.length}`);
  
  if (results.error.length > 0) {
    console.log('\nTypes with errors:');
    results.error.forEach(type => console.log(`- ${type}`));
  }
  
  if (results.success.length > 0) {
    console.log('\nSuccessfully consolidated types:');
    results.success.forEach(type => console.log(`- ${type}`));
  }
}

// Start the consolidation process
consolidateAllTypes().catch(error => {
  console.error('Unhandled error during consolidation:', error);
  process.exit(1);
}); 