/**
 * Component Migration Helper Script
 * 
 * This script helps with migrating imports from the old component structure to the new one.
 * 
 * Usage:
 * node scripts/migrate-components.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Optional command line arguments
const dryRun = process.argv.includes('--dry-run');
console.log(dryRun ? 'Running in dry-run mode (no changes will be made)' : 'Running in live mode');

// Component mapping - where each component should be relocated
const componentMapping = {
  // UI Components
  'button': 'ui',
  'avatar': 'ui',
  'alert': 'ui',
  'input': 'ui',
  'card': 'ui',
  'select': 'ui',
  'switch': 'ui',
  'dropdown-menu': 'ui',
  'separator': 'ui',
  'label': 'ui',
  'skeleton': 'ui',
  'sheet': 'ui',
  'tooltip': 'ui',
  'tabs': 'ui',
  'alert-dialog': 'ui',
  'error-boundary': 'ui',
  
  // Layout Components
  'sidebar-toggle': 'layout',
  'nav-bar': 'layout',
  'chat-header': 'layout',
  'sidebar-history': 'layout',
  'sidebar-user-nav': 'layout',
  'app-sidebar': 'layout',
  
  // Feature Components
  'chat': 'features',
  'message': 'features',
  'messages': 'features',
  'artifact': 'features',
  'visibility-selector': 'features',
  'multimodal-input': 'features',
  'message-actions': 'features',
  'message-editor': 'features',
  'message-reasoning': 'features',
  'suggested-actions': 'features',
  'suggestion': 'features',
  
  // Common Components
  'markdown': 'common',
  'code-block': 'common',
  'theme-provider': 'common',
  'animation-toggle': 'common',
  'animation-toggle-wrapper': 'common',
};

// Import pattern to match
const importPatterns = [
  /from ['"](\.\.\/)+components\/([^/'"]+)['"]/, // from '../components/button'
  /from ['"]@\/components\/([^/'"]+)['"]/, // from '@/components/button'
  /from ['"]components\/([^/'"]+)['"]/, // from 'components/button'
];

// Root directories to search for TypeScript/JavaScript files
const rootDirectories = ['app', 'components', 'src', 'pages', 'utils', 'hooks', 'lib'];

// Paths to skip
const ignorePaths = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
];

// Helper function to collect all .ts, .tsx, .js, .jsx files
function collectFiles(directory) {
  const files = [];
  
  function traverse(currentPath) {
    if (ignorePaths.some(p => currentPath.includes(p))) {
      return;
    }
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (
        entry.isFile() && 
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || 
         entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))
      ) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(directory);
  return files;
}

// Process a file to update imports
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;
    
    // Check each import pattern
    for (const pattern of importPatterns) {
      const matches = content.match(new RegExp(pattern, 'g'));
      
      if (matches) {
        for (const match of matches) {
          const componentMatch = pattern.exec(match);
          if (componentMatch && componentMatch[1]) {
            const componentName = componentMatch[1];
            const category = componentMapping[componentName];
            
            if (category) {
              // Create the new import path
              const newImport = match.replace(
                pattern, 
                `from '@/src/components/${category}/${componentName}'`
              );
              
              // Update the content
              updatedContent = updatedContent.replace(match, newImport);
              hasChanges = true;
              
              console.log(`In ${filePath}:`);
              console.log(`  - ${match}`);
              console.log(`  + ${newImport}`);
            }
          }
        }
      }
    }
    
    // Write the changes to the file if not in dry run mode
    if (hasChanges && !dryRun) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Main execution
function main() {
  console.log('Starting component import migration...');
  
  for (const directory of rootDirectories) {
    const directoryPath = path.join(process.cwd(), directory);
    
    if (fs.existsSync(directoryPath)) {
      console.log(`Searching in: ${directoryPath}`);
      const files = collectFiles(directoryPath);
      
      console.log(`Found ${files.length} files to process in ${directory}`);
      
      for (const file of files) {
        processFile(file);
      }
    }
  }
  
  console.log('Migration complete!');
}

main(); 