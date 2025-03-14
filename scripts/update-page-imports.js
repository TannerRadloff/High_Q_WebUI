/**
 * Update Page Imports Script
 * 
 * This script specifically updates component imports in Next.js pages
 * to use the new component structure
 */

const fs = require('fs');
const path = require('path');

// Paths to look for page files
const pageDirs = ['app', 'pages'];

// Component category mapping
const categoryMap = {
  // UI Components
  'Button': 'ui',
  'Input': 'ui',
  'Card': 'ui',
  'Avatar': 'ui',
  'Select': 'ui',
  'Dropdown': 'ui',
  'Alert': 'ui',
  'Switch': 'ui',
  
  // Layout Components
  'NavBar': 'layout',
  'ChatHeader': 'layout',
  'Sidebar': 'layout',
  'SidebarHistory': 'layout',
  'SidebarUserNav': 'layout',
  'AppSidebar': 'layout',
  
  // Feature Components
  'Chat': 'features',
  'Message': 'features',
  'Messages': 'features',
  'Artifact': 'features',
  'MultimodalInput': 'features',
  'MessageActions': 'features',
  'MessageEditor': 'features',
  
  // Common Components
  'Markdown': 'common',
  'CodeBlock': 'common',
  'ThemeProvider': 'common',
  'AnimationToggle': 'common',
};

// Import regex patterns for JSX/TSX imports
const importPatterns = [
  /import\s+{\s*([^}]+)\s*}\s+from\s+['"]@\/components['"]/g,
  /import\s+{\s*([^}]+)\s*}\s+from\s+['"]\.\.\/\.\.\/components['"]/g,
  /import\s+{\s*([^}]+)\s*}\s+from\s+['"]\.\.\/components['"]/g,
  /import\s+{\s*([^}]+)\s*}\s+from\s+['"]components['"]/g,
];

// Function to process a file
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  let hasChanges = false;
  
  // First, find all imports that match our patterns
  for (const pattern of importPatterns) {
    const matches = content.match(pattern);
    if (!matches) continue;
    
    for (const match of matches) {
      // Extract the components being imported
      const importMatch = /import\s+{\s*([^}]+)\s*}\s+from/.exec(match);
      if (!importMatch || !importMatch[1]) continue;
      
      // Split the components and trim whitespace
      const components = importMatch[1].split(',').map(c => c.trim());
      
      // Group components by their category
      const categorized = {};
      const notCategorized = [];
      
      for (const component of components) {
        let found = false;
        
        // Check if this component is in our mapping
        for (const [name, category] of Object.entries(categoryMap)) {
          if (component === name || component.startsWith(`${name} as `)) {
            if (!categorized[category]) {
              categorized[category] = [];
            }
            categorized[category].push(component);
            found = true;
            break;
          }
        }
        
        // If not found in our mapping, keep track of it
        if (!found) {
          notCategorized.push(component);
        }
      }
      
      // Create new import statements
      const newImports = [];
      
      // Add categorized imports
      for (const [category, comps] of Object.entries(categorized)) {
        newImports.push(`import { ${comps.join(', ')} } from '@/src/components/${category}';`);
      }
      
      // Keep uncategorized imports if any
      if (notCategorized.length > 0) {
        newImports.push(`import { ${notCategorized.join(', ')} } from '@/components';`);
      }
      
      // Replace the original import with our new imports
      if (newImports.length > 0) {
        updatedContent = updatedContent.replace(match, newImports.join('\n'));
        hasChanges = true;
      }
    }
  }
  
  // Write the changes back to the file if there were any
  if (hasChanges) {
    console.log(`Updating: ${filePath}`);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  }
}

// Find all page files (tsx, jsx)
function findPageFiles() {
  const pageFiles = [];
  
  for (const dir of pageDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) continue;
    
    function searchDir(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and .next
          if (entry.name !== 'node_modules' && entry.name !== '.next') {
            searchDir(fullPath);
          }
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) &&
          (entry.name === 'page.tsx' || entry.name.endsWith('.page.tsx') || 
           entry.name === 'layout.tsx' || entry.name.endsWith('.layout.tsx'))
        ) {
          pageFiles.push(fullPath);
        }
      }
    }
    
    searchDir(dirPath);
  }
  
  return pageFiles;
}

// Main function
function main() {
  console.log('Updating imports in Next.js pages...');
  
  const pageFiles = findPageFiles();
  console.log(`Found ${pageFiles.length} page files to process.`);
  
  for (const file of pageFiles) {
    processFile(file);
  }
  
  console.log('Page imports update complete!');
}

// Run the script
main(); 