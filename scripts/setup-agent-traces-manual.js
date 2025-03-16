#!/usr/bin/env node

/**
 * This script outputs the SQL commands for creating agent trace tables
 * These commands can be copied and pasted into the Supabase SQL editor
 */

const fs = require('fs');
const path = require('path');

async function outputSqlCommands() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║     AGENT TRACE TABLES SETUP (MANUAL)       ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  try {
    // Read the SQL script
    const sqlFilePath = path.join(__dirname, 'create-agent-trace-tables.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Read SQL script successfully\n');
    console.log('📋 Copy and paste the following SQL commands into the Supabase SQL editor:\n');
    console.log('='.repeat(80));
    console.log(sqlScript);
    console.log('='.repeat(80));
    
    console.log('\n📝 Instructions:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Paste the SQL commands above');
    console.log('5. Run the query');
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

outputSqlCommands().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
}); 