/**
 * Supabase Connection Test Script
 * ===============================
 * 
 * Simple script to test Supabase connection with both anon key and service role key
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║        SUPABASE CONNECTION TEST TOOL        ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  // Verify environment variables
  console.log('Environment variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Missing one or more required environment variables.');
    process.exit(1);
  }
  
  // Test with anon key first
  console.log('\n1️⃣ Testing connection with anon key...');
  try {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Try a simple query
    const { data: anonData, error: anonError } = await anonClient.from('chat').select('count(*)', { count: 'exact', head: true }).throwOnError();
    
    if (anonError) {
      console.error('❌ Anon key connection test failed with error:', anonError);
    } else {
      console.log('✅ Anon key connection test successful');
      console.log('   Result:', anonData);
    }
  } catch (error) {
    console.error('❌ Anon key connection test failed with exception:', error);
  }
  
  // Test with service role key
  console.log('\n2️⃣ Testing connection with service role key...');
  try {
    // Create client with service role key
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Try a simple query
    const { data: serviceData, error: serviceError } = await serviceClient.from('chat').select('count(*)', { count: 'exact', head: true }).throwOnError();
    
    if (serviceError) {
      console.error('❌ Service role key connection test failed with error:', serviceError);
    } else {
      console.log('✅ Service role key connection test successful');
      console.log('   Result:', serviceData);
    }
    
    // Try to list tables
    console.log('\n3️⃣ Attempting to list database tables...');
    try {
      // This is a PostgreSQL system query to list tables
      const { data: tablesData, error: tablesError } = await serviceClient.rpc('list_tables');
      
      if (tablesError) {
        console.error('❌ Failed to list tables:', tablesError.message);
        
        // Try alternative approach with direct SQL (if available)
        try {
          console.log('   Trying alternative approach...');
          const { data: sqlData, error: sqlError } = await serviceClient.sql(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
          `);
          
          if (sqlError) {
            console.error('❌ SQL approach also failed:', sqlError.message);
          } else {
            console.log('✅ Tables found via SQL:', sqlData);
          }
        } catch (sqlCatchError) {
          console.error('❌ SQL approach exception:', sqlCatchError.message);
        }
      } else {
        console.log('✅ Tables found:', tablesData);
      }
    } catch (tablesException) {
      console.error('❌ Exception when listing tables:', tablesException.message);
    }
  } catch (error) {
    console.error('❌ Service role key connection test failed with exception:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.log('\n🔍 Connection test complete');
}

// Run the test
testConnection().catch(error => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
}); 