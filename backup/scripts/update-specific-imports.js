const fs = require('fs');
const path = require('path');

// Define the mappings for import path updates
const importMappings = [
  {
    from: 'src/components/layout',
    to: 'components/layout'
  },
  {
    from: 'src/components/ui',
    to: 'components/ui'
  },
  {
    from: 'src/components/common',
    to: 'components/common'
  },
  {
    from: 'src/components/features/chat',
    to: 'app/features/chat/chat'
  },
  {
    from: 'src/components/features/messages',
    to: 'app/features/chat/messages'
  },
  {
    from: 'src/components/features/artifact',
    to: 'app/features/artifacts/artifact'
  },
  {
    from: 'src/components/features/artifact-actions',
    to: 'app/features/artifacts/artifact-actions'
  },
  {
    from: 'src/components/features/document',
    to: 'app/features/documents/document'
  },
  {
    from: 'src/components/features/document-preview',
    to: 'app/features/documents/document-preview'
  }
];

// List of specific files to update
const filesToUpdate = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/client-layout.tsx',
  'app/layout-content.tsx',
  'app/providers.tsx',
  'app/test-page.tsx',
  'app/home-layout.tsx',
  'app/error.tsx',
  'app/loading.tsx',
  'app/todos/components/TodoForm.tsx',
  'app/todos/components/TodoItem.tsx',
  'app/todos/components/TodoList.tsx',
  'app/todos/page.tsx',
  'app/chat-home/page.tsx',
  'app/agent/page.tsx',
  'app/agent-builder/page.tsx',
  'app/agent-dashboard/page.tsx',
  'app/notes/page.tsx',
  'components/layout/index.ts',
  'components/ui/index.ts',
  'components/common/index.ts',
  'components/auth/index.ts',
  'components/icons/index.ts'
];

// Check if a file exists
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

// Update import paths in a file
const updateImportsInFile = (filePath) => {
  try {
    // Skip if file doesn't exist
    if (!fileExists(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let updatedContent = content;

    importMappings.forEach(({ from, to }) => {
      // Create a regex to match import statements with the old path
      const importRegex = new RegExp(`from ['"]${from}(?:/[^'"]*)?['"]`, 'g');
      
      // Replace the old path with the new path
      updatedContent = updatedContent.replace(importRegex, (match) => {
        return match.replace(from, to);
      });
    });

    // Write the updated content back to the file if changes were made
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`Updated imports in ${filePath}`);
    } else {
      console.log(`No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating imports in ${filePath}:`, error);
  }
};

// Main function
const main = () => {
  console.log(`Processing ${filesToUpdate.length} files`);
  
  filesToUpdate.forEach(updateImportsInFile);
  
  console.log('Import paths update completed');
};

main(); 