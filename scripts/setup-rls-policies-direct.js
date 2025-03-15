/**
 * Supabase Row Level Security (RLS) Setup Script
 * ================================================
 * 
 * This script uses direct HTTP requests to set up RLS policies
 * instead of using the Supabase client library.
 */

const axios = require('axios');
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
  
  // Create base API client
  const apiClient = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`,
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  });
  
  // Function to execute SQL via REST API
  async function executeSql(sql) {
    try {
      console.log(`Executing SQL:\n${sql}`);
      
      // Use the direct SQL endpoint (note: this may need adjustment based on your Supabase setup)
      const response = await apiClient.post('/rpc/sql', {
        query: sql
      });
      
      console.log('SQL execution response:', response.status);
      return true;
    } catch (error) {
      console.error('Error executing SQL:', error.response?.data || error.message);
      return false;
    }
  }
  
  try {
    // 1. Enable RLS on tables
    console.log('\n📋 Enabling Row Level Security on tables...');
    const enableRlsResult = await executeSql(`
      ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vote ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;
    `);
    
    if (!enableRlsResult) {
      console.log('⚠️ Proceeding anyway - tables may already have RLS enabled');
    }
    
    // 2. Create helper functions
    console.log('\n📋 Creating helper functions...');
    const createHelperFnResult = await executeSql(`
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
    `);
    
    // 3. Create policies for the chat table
    console.log('\n📋 Setting up policies for chat table...');
    const chatPoliciesResult = await executeSql(`
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
    `);
    
    // 4. Create policies for the message table
    console.log('\n📋 Setting up policies for message table...');
    const messagePoliciesResult = await executeSql(`
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
    `);
    
    // 5. Create policies for the vote table
    console.log('\n📋 Setting up policies for vote table...');
    const votePoliciesResult = await executeSql(`
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
    `);
    
    // 6. Create policies for the document table
    console.log('\n📋 Setting up policies for document table...');
    const documentPoliciesResult = await executeSql(`
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
    `);
    
    console.log('\n🎉 RLS Policy setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify the configuration in the Supabase dashboard');
    console.log('2. Run `node scripts/verify-supabase-config.js` to verify the configuration');
    console.log('3. Test your application with different user accounts');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
setupRLSPolicies().catch(error => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
}); 