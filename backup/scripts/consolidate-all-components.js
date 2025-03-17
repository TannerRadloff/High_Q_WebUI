/**
 * Consolidate All Components Script
 * 
 * This script automatically consolidates all components in the codebase
 * by identifying and moving components from src/components and other locations
 * to the canonical app/features directory structure.
 * 
 * Usage: node scripts/consolidate-all-components.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting component consolidation process...');

// Components to skip (already consolidated or special cases)
const skipComponents = [
  'data-stream-handler',
  'datastreamhandler',
  'index' // Skip index files
];

// Define source directories to search for components
const sourceDirs = [
  path.join('src', 'components'),
  path.join('src', 'components', 'features'),
  path.join('src', 'components', 'ui'),
  path.join('src', 'components', 'features', 'ui'),
  path.join('src', 'components', 'common'),
  path.join('app', 'components')
];

// Get all component files from a directory
function getComponentFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(dir)
      .filter(file => 
        file.endsWith('.tsx') && 
        !skipComponents.includes(file.replace('.tsx', '')) &&
        fs.statSync(path.join(dir, file)).isFile()
      );
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
    return [];
  }
}

// Convert CamelCase component name to kebab-case
function toKebabCase(str) {
  // Remove file extension
  str = str.replace('.tsx', '');
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// Convert kebab-case to CamelCase for component name
function toCamelCase(str) {
  // Remove file extension
  str = str.replace('.tsx', '');
  
  return str
    .split('-')
    .map((word, index) => 
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('');
}

// Process a component file
function processComponent(componentFile, sourceDir) {
  const componentName = toCamelCase(componentFile.replace('.tsx', ''));
  const kebabName = toKebabCase(componentFile);
  
  // Skip components that are already in the skip list
  if (skipComponents.includes(kebabName)) {
    console.log(`Skipping ${componentName} (${kebabName}) as it's in the skip list`);
    return { status: 'skipped', component: componentName };
  }
  
  console.log(`Processing component: ${componentName} (${kebabName})`);
  
  return new Promise((resolve) => {
    exec(`node scripts/consolidate-components.js --component ${componentName}`, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (error) {
        console.error(`Error consolidating ${componentName}: ${error.message}`);
        console.error(stderr);
        resolve({ status: 'error', component: componentName, error: error.message });
      } else {
        console.log(`Successfully consolidated ${componentName}`);
        resolve({ status: 'success', component: componentName });
      }
    });
  });
}

async function consolidateAllComponents() {
  let componentsFound = [];
  
  // Collect all component files from source directories
  for (const dir of sourceDirs) {
    const files = getComponentFiles(dir);
    
    for (const file of files) {
      // Avoid duplicates
      if (!componentsFound.includes(file)) {
        componentsFound.push(file);
      }
    }
  }
  
  console.log(`Found ${componentsFound.length} components to consolidate`);
  
  // Process each component
  const results = {
    success: [],
    skipped: [],
    error: []
  };
  
  for (const componentFile of componentsFound) {
    // Find which directory the component is in
    let sourceDir;
    for (const dir of sourceDirs) {
      if (fs.existsSync(path.join(dir, componentFile))) {
        sourceDir = dir;
        break;
      }
    }
    
    if (!sourceDir) {
      console.error(`Could not find source directory for ${componentFile}`);
      results.error.push(componentFile);
      continue;
    }
    
    const result = await processComponent(componentFile, sourceDir);
    
    if (result.status === 'success') {
      results.success.push(result.component);
    } else if (result.status === 'skipped') {
      results.skipped.push(result.component);
    } else {
      results.error.push(result.component);
    }
    
    // Add a small delay between components to avoid file system race conditions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log('\n--- Consolidation Summary ---');
  console.log(`Components found: ${componentsFound.length}`);
  console.log(`Successfully consolidated: ${results.success.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Errors: ${results.error.length}`);
  
  if (results.error.length > 0) {
    console.log('\nComponents with errors:');
    results.error.forEach(component => console.log(`- ${component}`));
  }
  
  if (results.success.length > 0) {
    console.log('\nSuccessfully consolidated components:');
    results.success.forEach(component => console.log(`- ${component}`));
  }
}

// Start the consolidation process
consolidateAllComponents().catch(error => {
  console.error('Unhandled error during consolidation:', error);
  process.exit(1);
}); 