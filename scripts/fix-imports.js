const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'src/components/features/artifact-actions.tsx',
  'src/components/features/artifact-close-button.tsx',
  'src/components/features/artifact.tsx'
];

// Import mappings
const importMappings = {
  './ui/button': '@/components/ui/button',
  './ui/tooltip': '@/components/ui/tooltip',
  './toolbar': '@/components/features/toolbar',
  './icons': '@/components/features/icons'
};

// Process each file
filesToFix.forEach(filePath => {
  try {
    console.log(`Processing ${filePath}...`);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix imports
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      const importRegex = new RegExp(`from\\s+['"]${oldImport}['"]`, 'g');
      content = content.replace(importRegex, `from '${newImport}'`);
    }
    
    // Write the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`Fixed imports in ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('Import paths fixed successfully!'); 