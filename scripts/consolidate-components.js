/**
 * Component Consolidation Script
 * 
 * This script helps consolidate duplicate component implementations and
 * updates imports throughout the codebase.
 * 
 * Usage: node scripts/consolidate-components.js --component ComponentName
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let componentName = '';
let targetDir = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--component' && args[i + 1]) {
    componentName = args[i + 1];
  }
  if (args[i] === '--target' && args[i + 1]) {
    targetDir = args[i + 1];
  }
}

if (!componentName) {
  console.error('Error: Component name is required');
  console.log('Usage: node scripts/consolidate-components.js --component ComponentName [--target TargetDir]');
  process.exit(1);
}

// Convert CamelCase to kebab-case for file paths
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// List of special mappings for component names to specific directories
const specialMappings = {
  'message': 'messages',
  'message-actions': 'messages',
  'message-editor': 'messages', 
  'message-reasoning': 'messages',
  'agent-status-panel': 'agents',
  'agent-selector': 'agents',
  'document-preview': 'documents',
  'document-skeleton': 'documents',
  'artifact-actions': 'artifacts',
  'artifact-close-button': 'artifacts',
  'artifact-messages': 'artifacts',
  'create-artifact': 'artifacts',
  'code-editor': 'editors',
  'text-editor': 'editors',
  'image-editor': 'editors',
  'sheet-editor': 'editors',
};

// Configuration
const componentKebab = toKebabCase(componentName);

// Use the provided target directory, check special mappings, or use the kebab name
let targetDirName = targetDir || specialMappings[componentKebab] || componentKebab;

const canonicalDir = path.join('app', 'features', targetDirName);
const canonicalPath = path.join(canonicalDir, `${componentKebab}.tsx`);
const canonicalImport = `@/app/features/${targetDirName}/${componentKebab}`;

// Potential locations for duplicate components based on kebab-case
const potentialLocations = [
  path.join('src', 'components', `${componentKebab}.tsx`),
  path.join('src', 'components', 'features', `${componentKebab}.tsx`),
  path.join('src', 'components', 'ui', `${componentKebab}.tsx`),
  path.join('src', 'components', 'features', 'ui', `${componentKebab}.tsx`),
  path.join('src', 'components', 'common', `${componentKebab}.tsx`),
  path.join('app', 'components', `${componentKebab}.tsx`),
];

console.log(`Consolidating component: ${componentName} (${componentKebab}) to ${canonicalDir}`);

// Recursively search for files
function findFiles(dir, pattern, excludeDirs = ['node_modules', '.git', '.next']) {
  let results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!excludeDirs.includes(file)) {
        results = results.concat(findFiles(fullPath, pattern, excludeDirs));
      }
    } else if (file.includes(pattern) && (file.endsWith('.tsx') || file.endsWith('.jsx'))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// 1. Ensure canonical directory exists
if (!fs.existsSync(canonicalDir)) {
  console.log(`Creating directory: ${canonicalDir}`);
  fs.mkdirSync(canonicalDir, { recursive: true });
}

// 2. Check for existing canonical implementation
let componentContent = '';
if (fs.existsSync(canonicalPath)) {
  console.log(`Found canonical implementation at: ${canonicalPath}`);
  componentContent = fs.readFileSync(canonicalPath, 'utf8');
} else {
  console.log(`Canonical implementation not found at: ${canonicalPath}`);
  
  // Special case check for data-stream folder
  const specialPath = path.join('app', 'features', 'data-stream', `${componentKebab}.tsx`);
  if (componentKebab === 'data-stream-handler' && fs.existsSync(specialPath)) {
    console.log(`Found special implementation at: ${specialPath}`);
    componentContent = fs.readFileSync(specialPath, 'utf8');
    console.log(`Copying to canonical location: ${canonicalPath}`);
    fs.writeFileSync(canonicalPath, componentContent);
  } else {
    // 3. Look for implementations in potential locations
    let foundDuplicate = false;
    for (const location of potentialLocations) {
      if (fs.existsSync(location)) {
        console.log(`Found implementation at: ${location}`);
        componentContent = fs.readFileSync(location, 'utf8');
        foundDuplicate = true;
        
        // Copy to canonical location
        console.log(`Copying to canonical location: ${canonicalPath}`);
        fs.writeFileSync(canonicalPath, componentContent);
        break;
      }
    }
    
    if (!foundDuplicate) {
      console.error(`No implementation found in standard locations for ${componentName}`);
      console.log('Searching file system for any matching files...');
      
      const foundFiles = findFiles('src', componentKebab).concat(findFiles('app', componentKebab));
      
      if (foundFiles.length > 0) {
        console.log('Found possible implementations:');
        foundFiles.forEach(file => console.log(`- ${file}`));
        
        // Use the first found file
        const firstFile = foundFiles[0];
        console.log(`Using implementation from: ${firstFile}`);
        
        componentContent = fs.readFileSync(firstFile, 'utf8');
        fs.writeFileSync(canonicalPath, componentContent);
        foundDuplicate = true;
      }
      
      if (!foundDuplicate) {
        console.error(`No implementation found for ${componentName}. Exiting.`);
        process.exit(1);
      }
    }
  }
}

// 4. Create or update index.ts
const indexPath = path.join(canonicalDir, 'index.ts');
const indexContent = `export * from './${componentKebab}';`;

if (fs.existsSync(indexPath)) {
  const currentContent = fs.readFileSync(indexPath, 'utf8');
  if (!currentContent.includes(`export * from './${componentKebab}'`)) {
    console.log(`Updating index.ts at: ${indexPath}`);
    // Don't overwrite existing exports
    fs.appendFileSync(indexPath, `\n${indexContent}\n`);
  }
} else {
  console.log(`Creating index.ts at: ${indexPath}`);
  fs.writeFileSync(indexPath, indexContent);
}

// 5. Remove duplicate implementations
for (const location of potentialLocations) {
  if (fs.existsSync(location) && location !== canonicalPath) {
    console.log(`Removing duplicate implementation at: ${location}`);
    try {
      fs.unlinkSync(location);
    } catch (error) {
      console.error(`Error removing file: ${error.message}`);
    }
  }
}

// 6. Update imports throughout the codebase
console.log('Updating imports throughout the codebase...');

const excludeDirs = ['node_modules', '.git', '.next', 'out', 'build', 'dist'];
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx'];

function updateImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Old import patterns
    const oldImportPatterns = [
      `from '@/src/components/${componentKebab}'`,
      `from '@/src/components/features/${componentKebab}'`,
      `from '@/src/components/ui/${componentKebab}'`,
      `from '@/src/components/features/ui/${componentKebab}'`,
      `from '@/src/components/common/${componentKebab}'`,
      `from '@/app/components/${componentKebab}'`,
      `from '@/app/features/data-stream/${componentKebab}'`, // Special case for data-stream folder
      `import '@/src/components/${componentKebab}'`,
      `import '@/src/components/features/${componentKebab}'`,
      `import '@/src/components/ui/${componentKebab}'`,
      `import '@/src/components/features/ui/${componentKebab}'`,
      `import '@/src/components/common/${componentKebab}'`,
      `import '@/app/components/${componentKebab}'`,
      `import '@/app/features/data-stream/${componentKebab}'`, // Special case for data-stream folder
    ];
    
    let updatedContent = content;
    let modified = false;
    
    for (const pattern of oldImportPatterns) {
      if (updatedContent.includes(pattern)) {
        updatedContent = updatedContent.replace(
          new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          `from '${canonicalImport}'`
        );
        modified = true;
      }
    }
    
    if (modified) {
      console.log(`Updated imports in: ${filePath}`);
      fs.writeFileSync(filePath, updatedContent);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      try {
        // Skip excluded directories
        if (fs.statSync(fullPath).isDirectory()) {
          if (!excludeDirs.includes(file)) {
            walkDir(fullPath);
          }
          continue;
        }
        
        // Process source files
        const ext = path.extname(file);
        if (sourceExtensions.includes(ext)) {
          updateImportsInFile(fullPath);
        }
      } catch (err) {
        console.error(`Error processing ${fullPath}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
  }
}

try {
  // Start the import update process
  walkDir('src');
  walkDir('app');
  
  console.log(`Component ${componentName} has been successfully consolidated!`);
} catch (error) {
  console.error(`Error during consolidation: ${error.message}`);
  process.exit(1);
} 