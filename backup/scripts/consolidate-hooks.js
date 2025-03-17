/**
 * Hook Consolidation Script
 * 
 * This script consolidates duplicate hooks from src/hooks to app/utils/hooks
 * and updates imports throughout the codebase.
 * 
 * Usage: node scripts/consolidate-hooks.js --hook HookName
 * Example: node scripts/consolidate-hooks.js --hook useChatVisibility
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let hookName = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--hook' && args[i + 1]) {
    hookName = args[i + 1];
    break;
  }
}

if (!hookName) {
  console.error('Error: Hook name is required');
  console.log('Usage: node scripts/consolidate-hooks.js --hook HookName');
  process.exit(1);
}

// Convert camelCase to kebab-case for file paths
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

// Configuration
const hookKebab = toKebabCase(hookName);

const srcPath = path.join('src', 'hooks', `${hookKebab}.ts`);
const srcTsxPath = path.join('src', 'hooks', `${hookKebab}.tsx`);
const destPath = path.join('app', 'utils', 'hooks', `${hookKebab}.ts`);
const destTsxPath = path.join('app', 'utils', 'hooks', `${hookKebab}.tsx`);
const srcIndexPath = path.join('src', 'hooks', 'index.ts');
const destIndexPath = path.join('app', 'utils', 'hooks', 'index.ts');

console.log(`Consolidating hook: ${hookName} (${hookKebab})`);

// 1. Ensure destination directory exists
if (!fs.existsSync(path.join('app', 'utils', 'hooks'))) {
  console.log('Creating directory: app/utils/hooks');
  fs.mkdirSync(path.join('app', 'utils', 'hooks'), { recursive: true });
}

// 2. Check if the hook exists in the source location
let hookContent = '';
let sourceFile = '';
let destFile = '';

if (fs.existsSync(srcPath)) {
  console.log(`Found hook at: ${srcPath}`);
  hookContent = fs.readFileSync(srcPath, 'utf8');
  sourceFile = srcPath;
  destFile = destPath;
} else if (fs.existsSync(srcTsxPath)) {
  console.log(`Found hook at: ${srcTsxPath}`);
  hookContent = fs.readFileSync(srcTsxPath, 'utf8');
  sourceFile = srcTsxPath;
  destFile = destTsxPath;
} else {
  console.error(`Hook ${hookName} not found at ${srcPath} or ${srcTsxPath}`);
  process.exit(1);
}

// 3. Check if hook already exists in destination
if (fs.existsSync(destFile)) {
  console.log(`Hook already exists at: ${destFile}`);
  // Compare the content to see if it needs updating
  const existingContent = fs.readFileSync(destFile, 'utf8');
  if (existingContent.trim() === hookContent.trim()) {
    console.log('Existing hook is identical, no need to update.');
  } else {
    console.log('Updating existing hook with the source version.');
    fs.writeFileSync(destFile, hookContent);
  }
} else {
  // Copy hook to destination
  console.log(`Copying hook to: ${destFile}`);
  fs.writeFileSync(destFile, hookContent);
}

// 4. Update index files
function updateIndex(indexPath, hookKebab) {
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const exportStatement = `export * from './${hookKebab}';`;
    
    if (!indexContent.includes(exportStatement)) {
      console.log(`Updating index at: ${indexPath}`);
      fs.appendFileSync(indexPath, `\n${exportStatement}\n`);
    }
  } else {
    console.log(`Creating index at: ${indexPath}`);
    fs.writeFileSync(indexPath, `/**
 * Hooks
 * 
 * This barrel file exports all custom hooks
 */

export * from './${hookKebab}';\n`);
  }
}

// Update destination index
updateIndex(destIndexPath, hookKebab);

// 5. Update imports throughout the codebase
console.log('Updating imports throughout the codebase...');

// Define find patterns and replacement patterns
const findPatterns = [
  `from '@/src/hooks/${hookKebab}'`,
  `from '@/hooks/${hookKebab}'`,
  `from '@/src/hooks'`,
  `from '@/hooks'`,
];

const replacePatterns = [
  `from '@/app/utils/hooks/${hookKebab}'`,
  `from '@/app/utils/hooks/${hookKebab}'`,
  `from '@/app/utils/hooks'`,
  `from '@/app/utils/hooks'`,
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
      
      // Update named imports from index
      if (content.includes(`import { ${hookName} } from '@/src/hooks'`) || 
          content.includes(`import { ${hookName} } from '@/hooks'`)) {
        content = content
          .replace(`import { ${hookName} } from '@/src/hooks'`, `import { ${hookName} } from '@/app/utils/hooks'`)
          .replace(`import { ${hookName} } from '@/hooks'`, `import { ${hookName} } from '@/app/utils/hooks'`);
        modified = true;
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

// 6. Remove the original file (only if we've successfully copied it)
if (fs.existsSync(destFile) && fs.existsSync(sourceFile)) {
  console.log(`Removing original hook at: ${sourceFile}`);
  fs.unlinkSync(sourceFile);
}

console.log(`Hook ${hookName} has been successfully consolidated!`); 