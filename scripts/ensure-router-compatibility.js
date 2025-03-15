#!/usr/bin/env node

/**
 * Router Compatibility Script
 * ===========================
 * 
 * This script ensures compatibility between the app router and pages router
 * by creating safe import paths and barrel files.
 */

const fs = require('fs');
const path = require('path');

console.log('╔═════════════════════════════════════════════╗');
console.log('║     ROUTER COMPATIBILITY SETUP SCRIPT       ║');
console.log('╚═════════════════════════════════════════════╝\n');

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dirPath}`);
    }
  } catch (err) {
    console.error(`❌ Error creating directory ${dirPath}:`, err);
  }
}

// Create a barrel file that re-exports from a specific module
function createBarrelFile(filePath, importPath, named = [], defaultExport = null) {
  try {
    // Ensure the directory exists
    ensureDirectoryExists(path.dirname(filePath));
    
    // Create the import statement
    let content = `/**
 * Re-export from ${importPath}
 * This is a compatibility file to ensure safe imports across app router and pages router
 */

`;

    // Add named exports
    if (named.length > 0) {
      content += `export { ${named.join(', ')} } from '${importPath}';\n`;
    }
    
    // Add default export if needed
    if (defaultExport) {
      content += `\n// Re-export the default export\nimport ${defaultExport} from '${importPath}';\nexport default ${defaultExport};\n`;
    }
    
    // Write the file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created barrel file: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error creating barrel file ${filePath}:`, err);
  }
}

// Create compatibility directory for the pages directory
ensureDirectoryExists('components/pages-safe');

// Create compatibility imports for Supabase clients
console.log('\n📦 Setting up Supabase client compatibility files...');

// Create a pages-specific import file for TodoList 
console.log('\n📦 Creating pages-safe imports for TodoList...');
createBarrelFile(
  'components/pages-safe/index.ts',
  './TodoList',
  [],
  'PagesCompatibleTodoList'
);

// Ensure we have the common types directory
ensureDirectoryExists('types');

// Create an empty Database type if it doesn't exist
// This is important for TypeScript compatibility with Supabase clients
if (!fs.existsSync('types/supabase.ts')) {
  const typeContent = `/**
 * Supabase Database Types
 */
export type Database = {
  public: {
    Tables: {
      chat: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          visibility: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          visibility?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          visibility?: string;
        };
      };
      message: {
        Row: {
          id: string;
          role: string;
          content: string;
          chat_id: string;
          created_at: string;
          document_id?: string;
          artifact_title?: string;
        };
        Insert: {
          id?: string;
          role: string;
          content: string;
          chat_id: string;
          created_at?: string;
          document_id?: string;
          artifact_title?: string;
        };
        Update: {
          id?: string;
          role?: string;
          content?: string;
          chat_id?: string;
          created_at?: string;
          document_id?: string;
          artifact_title?: string;
        };
      };
      vote: {
        Row: {
          id: string;
          chat_id: string;
          message_id: string;
          is_upvoted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          message_id: string;
          is_upvoted: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          message_id?: string;
          is_upvoted?: boolean;
          created_at?: string;
        };
      };
      document: {
        Row: {
          id: string;
          content: string;
          kind: string;
          title?: string;
          user_id?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          kind: string;
          title?: string;
          user_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          kind?: string;
          title?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          title: string;
          is_complete: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          is_complete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          is_complete?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
`;
  
  fs.writeFileSync('types/supabase.ts', typeContent);
  console.log('✅ Created Supabase type definitions file');
}

console.log('\n🎉 Router compatibility setup complete!');
console.log('\nUse the following imports in your pages directory files:');
console.log('- import PagesCompatibleTodoList from "@/components/pages-safe";');
console.log('- import { createPagesApiClient } from "@/lib/supabase";');
console.log('\nUse the following in your pages API routes:');
console.log('const supabase = createPagesApiClient({ req, res });');

// Update the fix-build.js script to run this script during the build process
try {
  const fixBuildPath = 'scripts/fix-build.js';
  if (fs.existsSync(fixBuildPath)) {
    let fixBuildContent = fs.readFileSync(fixBuildPath, 'utf8');
    
    if (!fixBuildContent.includes('router-compatibility')) {
      // Add a call to our script before the end of the script
      const appendPoint = 'console.log(\'Build fix script completed successfully!\');';
      const newScript = `
// Ensure router compatibility
console.log('Running router compatibility script...');
require('./ensure-router-compatibility');
`;
      
      fixBuildContent = fixBuildContent.replace(
        appendPoint, 
        `// Ensure router compatibility
console.log('Running router compatibility script...');
try {
  require('./ensure-router-compatibility');
  console.log('Router compatibility script completed successfully!');
} catch (error) {
  console.error('Error running router compatibility script:', error);
}

${appendPoint}`
      );
      
      fs.writeFileSync(fixBuildPath, fixBuildContent);
      console.log('✅ Updated fix-build.js to run the router compatibility script');
    }
  }
} catch (err) {
  console.error('❌ Error updating fix-build.js:', err);
} 