/**
 * Type Consolidation Script
 * 
 * This script consolidates duplicate types from src/types to the root types directory
 * and updates imports throughout the codebase.
 * 
 * Usage: node scripts/consolidate-types.js --type TypeName
 * Example: node scripts/consolidate-types.js --type artifact
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let typeName = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    typeName = args[i + 1];
    break;
  }
}

if (!typeName) {
  console.error('Error: Type name is required');
  console.log('Usage: node scripts/consolidate-types.js --type TypeName');
  process.exit(1);
}

// Configuration
const srcPath = path.join('src', 'types', `${typeName}.ts`);
const srcTsxPath = path.join('src', 'types', `${typeName}.tsx`);
const destPath = path.join('types', `${typeName}.ts`);
const destTsxPath = path.join('types', `${typeName}.tsx`);
const srcIndexPath = path.join('src', 'types', 'index.ts');
const destIndexPath = path.join('types', 'index.ts');

console.log(`Consolidating type: ${typeName}`);

// 1. Ensure destination directory exists
if (!fs.existsSync('types')) {
  console.log('Creating directory: types');
  fs.mkdirSync('types', { recursive: true });
}

// 2. Check if the type file exists in the source location
let typeContent = '';
let sourceFile = '';
let destFile = '';

if (fs.existsSync(srcPath)) {
  console.log(`Found type at: ${srcPath}`);
  typeContent = fs.readFileSync(srcPath, 'utf8');
  sourceFile = srcPath;
  destFile = destPath;
} else if (fs.existsSync(srcTsxPath)) {
  console.log(`Found type at: ${srcTsxPath}`);
  typeContent = fs.readFileSync(srcTsxPath, 'utf8');
  sourceFile = srcTsxPath;
  destFile = destTsxPath;
} else {
  console.error(`Type ${typeName} not found at ${srcPath} or ${srcTsxPath}`);
  process.exit(1);
}

// 3. Check if type already exists in destination
if (fs.existsSync(destFile)) {
  console.log(`Type already exists at: ${destFile}`);
  // Compare the content to see if it needs updating
  const existingContent = fs.readFileSync(destFile, 'utf8');
  if (existingContent.trim() === typeContent.trim()) {
    console.log('Existing type is identical, no need to update.');
  } else {
    console.log('Updating existing type with the source version.');
    fs.writeFileSync(destFile, typeContent);
  }
} else {
  // Copy type to destination
  console.log(`Copying type to: ${destFile}`);
  fs.writeFileSync(destFile, typeContent);
}

// 4. Update index files
function updateIndex(indexPath, typeName) {
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const exportStatement = `export * from './${typeName}';`;
    
    if (!indexContent.includes(exportStatement)) {
      console.log(`Updating index at: ${indexPath}`);
      fs.appendFileSync(indexPath, `\n${exportStatement}\n`);
    }
  } else {
    console.log(`Creating index at: ${indexPath}`);
    fs.writeFileSync(indexPath, `/**
 * Types
 * 
 * This barrel file exports all type definitions
 */

export * from './${typeName}';\n`);
  }
}

// Update destination index
updateIndex(destIndexPath, typeName);

// 5. Update imports throughout the codebase
console.log('Updating imports throughout the codebase...');

// Define find patterns and replacement patterns
const findPatterns = [
  `from '@/src/types/${typeName}'`,
  `from '@/types/${typeName}'`,
  `from '@/src/types'`,
  `from '@/types'`,
];

const replacePatterns = [
  `from '@/types/${typeName}'`,
  `from '@/types/${typeName}'`,
  `from '@/types'`,
  `from '@/types'`,
];

// Recursively search and update files
function updateImports(dir) {
  const fileTypes = ['.ts', '.tsx', '.js', '.jsx'];
  const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
  
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        if (!excludeDirs.includes(file)) {
          updateImports(fullPath);
        }
        continue;
      }
      
      if (!fileTypes.includes(path.extname(file))) {
        continue;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Update direct imports
      for (let i = 0; i < findPatterns.length; i++) {
        if (content.includes(findPatterns[i])) {
          content = content.replace(
            new RegExp(findPatterns[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            replacePatterns[i]
          );
          modified = true;
        }
      }
      
      if (modified) {
        console.log(`Updated imports in: ${fullPath}`);
        fs.writeFileSync(fullPath, content);
      }
    } catch (error) {
      console.error(`Error processing file ${fullPath}: ${error.message}`);
    }
  }
}

// Start updating imports
updateImports('./src');
updateImports('./app');
updateImports('./lib');
updateImports('./components');
updateImports('./artifacts');

// 6. Remove the original file (only if we've successfully copied it)
if (fs.existsSync(destFile) && fs.existsSync(sourceFile)) {
  console.log(`Removing original type at: ${sourceFile}`);
  fs.unlinkSync(sourceFile);
}

console.log(`Type ${typeName} has been successfully consolidated!`); 