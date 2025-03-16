#!/usr/bin/env node

/**
 * This script sets up the agent trace tables in Supabase
 * It reads the SQL script and executes it against the Supabase database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these variables in your .env.local file and try again.');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAgentTraces() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║        AGENT TRACE TABLES SETUP             ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  try {
    // Read the SQL script
    const sqlFilePath = path.join(__dirname, 'create-agent-trace-tables.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Read SQL script successfully');
    
    // Split the SQL script into individual statements
    // This is a simple approach and might need refinement for complex SQL scripts
    const statements = sqlScript
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Execute the SQL statement directly
        const { error } = await supabase.rpc('pg_query', { query: statement });
        
        if (error) {
          console.warn(`   ⚠️ Warning executing statement ${i + 1}: ${error.message}`);
          // Continue with the next statement even if this one fails
          // This allows for idempotent execution (IF NOT EXISTS clauses)
        }
      } catch (stmtError) {
        console.warn(`   ⚠️ Warning executing statement ${i + 1}: ${stmtError.message}`);
        // Continue with the next statement
      }
    }
    
    console.log('✅ SQL execution completed');
    
    // Verify the tables were created
    console.log('\n🔍 Verifying table creation...');
    
    // Check if agent_trace table exists
    const { data: agentTraceExists, error: agentTraceExistsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'agent_trace')
      .eq('table_schema', 'public')
      .single();
    
    if (agentTraceExistsError || !agentTraceExists) {
      console.error('❌ agent_trace table does not exist or is not accessible');
    } else {
      console.log('✅ agent_trace table exists and is accessible');
    }
    
    // Check if agent_trace_span table exists
    const { data: agentTraceSpanExists, error: agentTraceSpanExistsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'agent_trace_span')
      .eq('table_schema', 'public')
      .single();
    
    if (agentTraceSpanExistsError || !agentTraceSpanExists) {
      console.error('❌ agent_trace_span table does not exist or is not accessible');
    } else {
      console.log('✅ agent_trace_span table exists and is accessible');
    }
    
    console.log('\n🎉 Setup complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

setupAgentTraces().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
}); 