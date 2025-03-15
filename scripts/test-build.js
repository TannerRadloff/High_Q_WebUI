#!/usr/bin/env node

/**
 * Test Build Script
 * ================
 * 
 * This script runs a test build to validate that our fixes work
 * without actually deploying the application.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔═════════════════════════════════════════════╗');
console.log('║           TEST BUILD VALIDATION             ║');
console.log('╚═════════════════════════════════════════════╝\n');

// First, run our compatibility script to ensure the environment is set up
console.log('1️⃣ Running compatibility setup...');
try {
  require('./ensure-router-compatibility');
  console.log('✅ Compatibility setup complete\n');
} catch (error) {
  console.error('❌ Error in compatibility setup:', error);
  process.exit(1);
}

// Run our build fix script
console.log('2️⃣ Running build fixes...');
try {
  require('./fix-build');
  console.log('✅ Build fixes applied\n');
} catch (error) {
  console.error('❌ Error in build fixes:', error);
  process.exit(1);
}

// Copy the todos table to the create tables script if not yet included
console.log('3️⃣ Ensuring todos table is included in database schema...');
try {
  const createTablesPath = path.join(process.cwd(), 'scripts', 'create-tables-and-policies.sql');
  if (fs.existsSync(createTablesPath)) {
    let sqlContent = fs.readFileSync(createTablesPath, 'utf8');
    
    // Check if todos table is already included
    if (!sqlContent.includes('CREATE TABLE IF NOT EXISTS public.todos')) {
      console.log('Adding todos table to database schema...');
      
      // Find the last CREATE TABLE statement
      const lastTableIndex = sqlContent.lastIndexOf('CREATE TABLE IF NOT EXISTS');
      if (lastTableIndex !== -1) {
        // Find the end of that statement (the semicolon)
        const endOfLastTable = sqlContent.indexOf(';', lastTableIndex);
        if (endOfLastTable !== -1) {
          // Insert the todos table definition after the last table
          const newContent = sqlContent.slice(0, endOfLastTable + 1) + 
            `\n\n-- Create the todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for todos table
CREATE INDEX IF NOT EXISTS todos_created_at_idx ON public.todos(created_at);` + 
            sqlContent.slice(endOfLastTable + 1);
          
          fs.writeFileSync(createTablesPath, newContent);
          console.log('✅ Added todos table to schema');
        }
      }
    } else {
      console.log('✅ Todos table already in schema');
    }
  } else {
    console.log('⚠️ Schema file not found, skipping table check');
  }
} catch (error) {
  console.error('❌ Error updating schema:', error);
}

// Test the build
console.log('\n4️⃣ Running test build...');
try {
  // Just run the next build command to validate everything works
  console.log('Running "next build --no-lint"...');
  execSync('npx next build --no-lint', { stdio: 'inherit' });
  console.log('✅ Build successful!\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Try to extract helpful information from the error
  if (error.stdout) {
    console.log('\nBuild output:');
    console.log(error.stdout.toString());
  }
  
  if (error.stderr) {
    console.log('\nBuild errors:');
    console.log(error.stderr.toString());
  }
  
  console.log('\n5️⃣ Analyzing build failure...');
  try {
    // Check for common issues
    if (error.message.includes('next/headers')) {
      console.log('⚠️ Issue detected: Usage of next/headers in pages directory');
      console.log('   This is likely due to mixing App Router and Pages Router components.');
      console.log('   Solution: Make sure you\'re using the compatibility versions:');
      console.log('   - Replace: import TodoList from "@/app/components/TodoList"');
      console.log('   - With: import PagesCompatibleTodoList from "@/components/pages-safe"');
    } else if (error.message.includes('Module not found')) {
      console.log('⚠️ Issue detected: Missing module');
      console.log('   Try running: npm install');
    }
  } catch (analysisError) {
    console.error('Error during analysis:', analysisError);
  }
  
  process.exit(1);
}

console.log('🎉 Build validation complete! Your application should now deploy successfully.');
console.log('\nRemember to:');
console.log('1. Run the SQL script to create tables in Supabase');
console.log('2. Verify environment variables are correctly set up');
console.log('3. Test the application locally before deploying'); 