/**
 * Supabase Configuration Verification Script
 * ==========================================
 * 
 * This script verifies the Supabase configuration, checking:
 * 1. Environment variables
 * 2. Database tables and schema
 * 3. Authentication and permissions
 * 4. RLS policies (if possible)
 * 
 * Usage: 
 * - Make sure .env.local is in the project root
 * - Run with Node.js: node scripts/verify-supabase-config.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Required tables and their expected columns
const requiredSchema = {
  chat: ['id', 'user_id', 'title', 'created_at', 'visibility'],
  message: ['id', 'role', 'content', 'chat_id', 'created_at', 'document_id', 'artifact_title'],
  vote: ['id', 'chat_id', 'message_id', 'is_upvoted', 'created_at']
};

async function verifySupabaseConfig() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║        SUPABASE CONFIGURATION CHECK         ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  // Step 1: Verify environment variables
  console.log('1️⃣ Checking Environment Variables');
  console.log('--------------------------------');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const optionalEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'POSTGRES_URL'
  ];
  
  let envVarsValid = true;
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required env var: ${varName}`);
      envVarsValid = false;
    } else {
      console.log(`✅ ${varName} is present`);
    }
  }
  
  for (const varName of optionalEnvVars) {
    if (process.env[varName]) {
      console.log(`ℹ️ Optional ${varName} is present`);
    } else {
      console.log(`ℹ️ Optional ${varName} is not set`);
    }
  }
  
  if (!envVarsValid) {
    console.error('\n❌ Environment variables check failed. Please set the missing variables in .env.local');
    process.exit(1);
  }
  
  console.log('\n✅ All required environment variables are present\n');
  
  // Step 2: Try to create a Supabase client
  console.log('2️⃣ Testing Supabase Client Creation');
  console.log('--------------------------------');
  
  let supabase;
  try {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client created successfully');
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error.message);
    process.exit(1);
  }
  
  // Step 3: Check if DB is accessible with anon key (public tables should fail, which is good for security)
  console.log('\n3️⃣ Testing Anonymous Access (should be denied)');
  console.log('-------------------------------------------');
  
  const tables = Object.keys(requiredSchema);
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true });
        
      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('permission')) {
          console.log(`✅ ${table}: Correctly requires authentication`);
        } else {
          console.warn(`⚠️ ${table}: Error but not permission-related: ${error.message}`);
        }
      } else {
        console.warn(`⚠️ ${table}: WARNING! Anonymous access is allowed! This is a security risk.`);
      }
    } catch (err) {
      console.error(`❌ Error testing ${table}:`, err.message);
    }
  }
  
  // Step 4: Test with service role key if available (admin access)
  console.log('\n4️⃣ Testing Admin Access (requires SUPABASE_SERVICE_ROLE_KEY)');
  console.log('-------------------------------------------------------');
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('ℹ️ SUPABASE_SERVICE_ROLE_KEY not provided, skipping admin access checks');
    console.log('   Add this to your .env.local file for complete verification');
  } else {
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      console.log('✅ Admin client created successfully');
      
      // Try to verify the database schema
      console.log('\n5️⃣ Verifying Database Schema');
      console.log('-------------------------');
      
      for (const [table, expectedColumns] of Object.entries(requiredSchema)) {
        try {
          // First check if the table exists
          const { data, error } = await adminClient
            .from(table)
            .select('count(*)', { count: 'exact', head: true });
            
          if (error) {
            console.error(`❌ Table "${table}" access error: ${error.message}`);
            continue;
          }
          
          console.log(`✅ Table "${table}" exists and is accessible`);
          
          // Now try to get the columns
          try {
            // This is a workaround to get columns - we fetch a single row then check its keys
            const { data: sampleRow, error: sampleError } = await adminClient
              .from(table)
              .select('*')
              .limit(1)
              .single();
              
            if (sampleError && !sampleError.message.includes('No rows found')) {
              console.error(`❌ Error fetching sample from "${table}": ${sampleError.message}`);
              continue;
            }
            
            if (sampleRow) {
              const actualColumns = Object.keys(sampleRow);
              const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
              
              if (missingColumns.length > 0) {
                console.error(`❌ Table "${table}" is missing columns: ${missingColumns.join(', ')}`);
              } else {
                console.log(`✅ Table "${table}" has all required columns`);
              }
              
              // Extra columns are fine
              const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
              if (extraColumns.length > 0) {
                console.log(`ℹ️ Table "${table}" has additional columns: ${extraColumns.join(', ')}`);
              }
            } else {
              console.log(`ℹ️ Table "${table}" appears to be empty, can't verify columns`);
            }
          } catch (colError) {
            console.error(`❌ Error checking columns for "${table}": ${colError.message}`);
          }
        } catch (tableError) {
          console.error(`❌ Error checking table "${table}": ${tableError.message}`);
        }
      }
      
      // Check RLS policies
      console.log('\n6️⃣ Checking RLS Policies');
      console.log('---------------------');
      
      try {
        // This requires PostgreSQL admin privileges which may not be available
        // through the service role, but we can try
        const { data: rlsData, error: rlsError } = await adminClient.rpc('get_policies');
        
        if (rlsError) {
          console.warn(`⚠️ Couldn't check RLS policies directly: ${rlsError.message}`);
          console.log('ℹ️ This is normal if using the service role key without full admin access');
        } else if (rlsData) {
          console.log('✅ Successfully retrieved RLS policies');
          console.log(rlsData);
        }
      } catch (rlsCheckError) {
        console.warn(`⚠️ RLS policy check error: ${rlsCheckError.message}`);
      }
    } catch (adminError) {
      console.error('❌ Failed to create admin client:', adminError.message);
    }
  }
  
  console.log('\n✨ Verification Complete! ✨\n');
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🔍 For a more complete check, add SUPABASE_SERVICE_ROLE_KEY to your .env.local');
    console.log('   and run this script again.\n');
  }
  
  console.log('📋 Recommendations:');
  console.log('1. Ensure all tables have RLS enabled');
  console.log('2. Set appropriate Row Level Security policies');
  console.log('3. Make sure authentication is properly configured');
  console.log('\nSee SUPABASE_SETUP.md for full RLS policy examples');
}

// Run the verification
verifySupabaseConfig().catch(error => {
  console.error('\n❌ Verification script error:', error);
  process.exit(1);
}); 