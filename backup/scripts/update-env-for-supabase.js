/**
 * Supabase Environment Variable Update Script
 * ============================================
 * 
 * This script checks if the required Supabase environment variables
 * are present in the .env.local file and adds a template for missing ones.
 * 
 * Usage:
 * - Run with Node.js: node scripts/update-env-for-supabase.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function updateEnvFile() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║     SUPABASE ENVIRONMENT VARIABLE CHECK     ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  // Check if .env.local exists
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found. Please create it first.');
    console.log('   You can copy .env.example to .env.local as a starting point.');
    process.exit(1);
  }
  
  // Read the existing .env.local file
  let envContent = fs.readFileSync(envPath, 'utf8');
  let updatedContent = envContent;
  
  // Check for required variables
  const supabaseVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  const missingVars = [];
  
  for (const [key, value] of Object.entries(supabaseVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }
  
  if (missingVars.length === 0) {
    console.log('✅ All required Supabase environment variables are present in .env.local\n');
    return;
  }
  
  console.log('⚠️ Missing Supabase environment variables detected:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  
  // Add template entries for missing variables
  let addedContent = '\n\n';
  
  if (!supabaseVars['NEXT_PUBLIC_SUPABASE_URL']) {
    addedContent += '# Required: Supabase Project URL (from Project Settings > API)\n';
    addedContent += 'NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co\n\n';
  }
  
  if (!supabaseVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    addedContent += '# Required: Supabase Anon Key (from Project Settings > API > Project API keys)\n';
    addedContent += 'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...your-anon-key\n\n';
  }
  
  if (!supabaseVars['SUPABASE_SERVICE_ROLE_KEY']) {
    addedContent += '# Required for admin operations: Service Role Key (from Project Settings > API > Project API keys)\n';
    addedContent += '# CAUTION: This key has admin privileges and should never be exposed to clients\n';
    addedContent += 'SUPABASE_SERVICE_ROLE_KEY=eyJh...your-service-role-key\n\n';
  }
  
  // Append to the env file if needed
  if (addedContent !== '\n\n') {
    if (!envContent.endsWith('\n')) {
      addedContent = '\n' + addedContent;
    }
    
    updatedContent = envContent + addedContent;
    
    // Write updated content back to .env.local
    fs.writeFileSync(envPath, updatedContent, 'utf8');
    
    console.log('\n✅ Added template entries for missing variables to .env.local');
    console.log('\n📋 Instructions:');
    console.log('1. Open your .env.local file and replace the placeholder values with actual credentials');
    console.log('2. Get your Supabase credentials from the Supabase dashboard:');
    console.log('   - Go to https://app.supabase.io/');
    console.log('   - Select your project');
    console.log('   - Go to Project Settings > API');
    console.log('   - Copy the "Project URL" for NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - Copy the "anon public" key for NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   - Copy the "service_role" key for SUPABASE_SERVICE_ROLE_KEY');
    console.log('\n⚠️ IMPORTANT: Keep your SUPABASE_SERVICE_ROLE_KEY secret and never expose it to clients');
  }
}

// Run the update
updateEnvFile().catch(error => {
  console.error('\n❌ Error updating environment variables:', error);
  process.exit(1);
}); 