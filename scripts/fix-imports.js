/**
 * This script fixes import paths in the project to ensure consistent path resolution
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Path mappings to fix
const pathMappings = {
  // Fix relative imports in src/components/features
  './ui/': '@/src/components/ui/',
  './markdown': '@/src/components/common/markdown',
  './icons': '@/src/components/common/icons',
  
  // Fix other common path issues
  '@/components/ui/': '@/src/components/ui/',
  '@/components/features/': '@/src/components/features/',
  '@/components/common/': '@/src/components/common/',
};

// Find all TypeScript and TSX files in the src directory
const files = glob.sync('src/**/*.{ts,tsx}');

console.log(`Found ${files.length} files to process`);

// Process each file
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  // Apply each path mapping
  Object.entries(pathMappings).forEach(([from, to]) => {
    // Look for import statements with the path to replace
    const importRegex = new RegExp(`import\\s+(?:{[^}]*}|[^{};]*)\\s+from\\s+['"]${from}`, 'g');
    
    if (importRegex.test(content)) {
      hasChanges = true;
      content = content.replace(importRegex, match => {
        return match.replace(from, to);
      });
    }
  });
  
  // Save the file if changes were made
  if (hasChanges) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed imports in ${file}`);
  }
});

console.log('Import path fixing completed!'); 