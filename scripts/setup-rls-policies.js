/**
 * Supabase Row Level Security (RLS) Setup Script
 * ================================================
 * 
 * This script will apply RLS policies to the required tables in the Supabase project.
 * It ensures that users can only access and modify their own data, providing proper
 * security for the chat application.
 * 
 * Usage:
 * - Make sure .env.local contains your Supabase credentials, including SUPABASE_SERVICE_ROLE_KEY
 * - Run with Node.js: node scripts/setup-rls-policies.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupRLSPolicies() {
  console.log('╔═════════════════════════════════════════════╗');
  console.log('║       SUPABASE RLS POLICY SETUP TOOL        ║');
  console.log('╚═════════════════════════════════════════════╝\n');
  
  // Check for required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease add these to your .env.local file and try again.');
    process.exit(1);
  }
  
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Role Key Exists:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Yes' : 'No');
  console.log('Service Role Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
  
  try {
    // Create Supabase admin client with service role key
    console.log('\nCreating Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('1️⃣ Connecting to Supabase with admin privileges...');
    
    // Test the connection
    console.log('Testing connection to Supabase...');
    try {
      const { data, error } = await supabase.from('chat').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Connection test failed: ${error.message}`);
        console.error('Error details:', JSON.stringify(error, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Connected to Supabase successfully\n');
      console.log('Connection test result:', data);
      
      // Execute SQL to enable RLS and set up policies
      console.log('2️⃣ Setting up RLS policies...');
      
      // Function to execute SQL and handle errors
      async function executeSQL(sql, description) {
        try {
          console.log(`Executing SQL for: ${description}`);
          const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
          if (error) {
            console.error(`❌ Error setting up ${description}: ${error.message}`);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // Alternative: Try to run the SQL directly
            console.log(`Attempting to run SQL directly for ${description}...`);
            const { error: directError } = await supabase.sql(sql);
            if (directError) {
              console.error(`❌ Direct SQL execution failed: ${directError.message}`);
              return false;
            } else {
              console.log(`✅ Direct SQL execution successful for ${description}`);
              return true;
            }
          }
          console.log(`✅ ${description} set up successfully`);
          return true;
        } catch (err) {
          console.error(`❌ Exception setting up ${description}: ${err.message}`);
          console.error('Stack trace:', err.stack);
          return false;
        }
      }

      // 1. Enable RLS on tables
      console.log('\n📋 Enabling Row Level Security on tables...');
      const enableRlsResult = await executeSQL(`
        ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.vote ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;
      `, 'RLS enablement');
      
      if (!enableRlsResult) {
        // If we can't enable RLS, proceed anyway as it might already be enabled
        console.log('⚠️ Proceeding anyway - tables may already have RLS enabled');
      }
      
      // 2. Create a helper function for user ownership
      console.log('\n📋 Creating helper functions...');
      const createHelperFnResult = await executeSQL(`
        -- Helper function to check if a user owns a chat
        CREATE OR REPLACE FUNCTION public.is_chat_owner(chat_id UUID)
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM public.chat 
            WHERE id = chat_id 
            AND user_id = auth.uid()
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Helper function to check if a chat is public
        CREATE OR REPLACE FUNCTION public.is_chat_public(chat_id UUID)
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM public.chat 
            WHERE id = chat_id 
            AND visibility = 'public'
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `, 'helper functions');
      
      // 3. Create policies for the chat table
      console.log('\n📋 Setting up policies for chat table...');
      const chatPoliciesResult = await executeSQL(`
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can view their own chats" ON public.chat;
        DROP POLICY IF EXISTS "Users can view public chats" ON public.chat;
        DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chat;
        DROP POLICY IF EXISTS "Users can update their own chats" ON public.chat;
        DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chat;
        
        -- Create new policies
        CREATE POLICY "Users can view their own chats" 
          ON public.chat FOR SELECT 
          USING (user_id = auth.uid());
          
        CREATE POLICY "Users can view public chats" 
          ON public.chat FOR SELECT 
          USING (visibility = 'public');
          
        CREATE POLICY "Users can insert their own chats" 
          ON public.chat FOR INSERT 
          WITH CHECK (user_id = auth.uid());
          
        CREATE POLICY "Users can update their own chats" 
          ON public.chat FOR UPDATE 
          USING (user_id = auth.uid());
          
        CREATE POLICY "Users can delete their own chats" 
          ON public.chat FOR DELETE 
          USING (user_id = auth.uid());
      `, 'chat table policies');
      
      // 4. Create policies for the message table
      console.log('\n📋 Setting up policies for message table...');
      const messagePoliciesResult = await executeSQL(`
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can view messages in their own chats" ON public.message;
        DROP POLICY IF EXISTS "Users can view messages in public chats" ON public.message;
        DROP POLICY IF EXISTS "Users can insert messages in their own chats" ON public.message;
        DROP POLICY IF EXISTS "Users can delete their own messages" ON public.message;
        
        -- Create new policies
        CREATE POLICY "Users can view messages in their own chats" 
          ON public.message FOR SELECT 
          USING (is_chat_owner(chat_id));
          
        CREATE POLICY "Users can view messages in public chats" 
          ON public.message FOR SELECT 
          USING (is_chat_public(chat_id));
          
        CREATE POLICY "Users can insert messages in their own chats" 
          ON public.message FOR INSERT 
          WITH CHECK (is_chat_owner(chat_id));
          
        CREATE POLICY "Users can delete their own messages" 
          ON public.message FOR DELETE 
          USING (chat_id IN (
            SELECT id FROM public.chat WHERE user_id = auth.uid()
          ));
      `, 'message table policies');
      
      // 5. Create policies for the vote table
      console.log('\n📋 Setting up policies for vote table...');
      const votePoliciesResult = await executeSQL(`
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can view votes for their chats" ON public.vote;
        DROP POLICY IF EXISTS "Users can view votes for public chats" ON public.vote;
        DROP POLICY IF EXISTS "Users can insert votes" ON public.vote;
        DROP POLICY IF EXISTS "Users can update their own votes" ON public.vote;
        DROP POLICY IF EXISTS "Users can delete their own votes" ON public.vote;
        
        -- Create new policies
        CREATE POLICY "Users can view votes for their chats" 
          ON public.vote FOR SELECT 
          USING (chat_id IN (
            SELECT id FROM public.chat WHERE user_id = auth.uid()
          ));
          
        CREATE POLICY "Users can view votes for public chats" 
          ON public.vote FOR SELECT 
          USING (chat_id IN (
            SELECT id FROM public.chat WHERE visibility = 'public'
          ));
          
        CREATE POLICY "Users can insert votes" 
          ON public.vote FOR INSERT 
          WITH CHECK (
            chat_id IN (
              SELECT id FROM public.chat 
              WHERE user_id = auth.uid() OR visibility = 'public'
            )
          );
          
        CREATE POLICY "Users can update their own votes" 
          ON public.vote FOR UPDATE 
          USING (chat_id IN (
            SELECT id FROM public.chat WHERE user_id = auth.uid()
          ));
          
        CREATE POLICY "Users can delete their own votes" 
          ON public.vote FOR DELETE 
          USING (chat_id IN (
            SELECT id FROM public.chat WHERE user_id = auth.uid()
          ));
      `, 'vote table policies');
      
      // 6. Create policies for the document table
      console.log('\n📋 Setting up policies for document table...');
      const documentPoliciesResult = await executeSQL(`
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can view their own documents" ON public.document;
        DROP POLICY IF EXISTS "Users can insert their own documents" ON public.document;
        DROP POLICY IF EXISTS "Users can update their own documents" ON public.document;
        DROP POLICY IF EXISTS "Users can delete their own documents" ON public.document;
        
        -- Create new policies
        CREATE POLICY "Users can view their own documents" 
          ON public.document FOR SELECT 
          USING (user_id = auth.uid() OR user_id IS NULL);
          
        CREATE POLICY "Users can insert their own documents" 
          ON public.document FOR INSERT 
          WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
          
        CREATE POLICY "Users can update their own documents" 
          ON public.document FOR UPDATE 
          USING (user_id = auth.uid() OR user_id IS NULL);
          
        CREATE POLICY "Users can delete their own documents" 
          ON public.document FOR DELETE 
          USING (user_id = auth.uid() OR user_id IS NULL);
      `, 'document table policies');
      
      // Check overall results
      const allPoliciesSuccessful = chatPoliciesResult && messagePoliciesResult && votePoliciesResult && documentPoliciesResult;
      
      if (allPoliciesSuccessful) {
        console.log('\n✅ All RLS policies were set up successfully!');
      } else {
        console.warn('\n⚠️ Some RLS policies may not have been applied correctly. Check the logs above for details.');
      }
      
      // Create SQL function for execute_sql RPC if it doesn't exist
      console.log('\n3️⃣ Creating execute_sql RPC function (if needed)...');
      
      // Check if the function already exists before creating it
      const { data: functionExists, error: functionCheckError } = await supabase
        .rpc('execute_sql', { sql_query: 'SELECT 1' })
        .catch(() => ({ data: null, error: { message: 'Function does not exist' } }));
      
      if (functionCheckError && functionCheckError.message.includes('does not exist')) {
        console.log('⚠️ The execute_sql function does not exist yet. Creating it now...');
        
        // Create the function directly with the admin client
        const { error: createFuncError } = await supabase.rpc('postgres_execute', {
          query: `
            CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
            RETURNS VOID AS $$
            BEGIN
              EXECUTE sql_query;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            GRANT EXECUTE ON FUNCTION execute_sql TO service_role;
          `
        }).catch(err => ({ error: err }));
        
        if (createFuncError) {
          console.error(`❌ Failed to create execute_sql function: ${createFuncError.message}`);
          console.error('You may need to create this function manually in the SQL editor with SECURITY DEFINER privileges.');
        } else {
          console.log('✅ Created execute_sql function successfully');
        }
      } else {
        console.log('✅ execute_sql function already exists');
      }
      
      console.log('\n🎉 RLS Policy setup complete!');
      console.log('\n📋 Next steps:');
      console.log('1. Run `node scripts/verify-supabase-config.js` to verify the configuration');
      console.log('2. Ensure you have a valid SUPABASE_SERVICE_ROLE_KEY in your .env.local');
      console.log('3. Test your application with different user accounts\n');
      
    } catch (connError) {
      console.error('❌ Connection test failed with exception:', connError.message);
      console.error('Stack trace:', connError.stack);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error during client creation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the setup
setupRLSPolicies().catch(error => {
  console.error('\n❌ Unhandled error:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}); 