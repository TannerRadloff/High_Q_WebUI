// This script creates a demo user account in Supabase
// Run with: node scripts/create-demo-user.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // This is the admin key, NOT the anon key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Required environment variables are missing.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file.');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDemoUser() {
  // Demo user credentials
  const email = 'demo@example.com';
  const password = 'demo1';
  const username = 'demo';

  try {
    // Check if user already exists
    const { data: existingUsers, error: lookupError } = await supabase.auth.admin.listUsers();
    
    if (lookupError) {
      throw lookupError;
    }
    
    const userExists = existingUsers.users.some(user => user.email === email);
    
    if (userExists) {
      console.log('Demo user already exists. Skipping creation.');
      return;
    }

    // Create the demo user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        username,
        full_name: 'Demo User'
      }
    });

    if (error) {
      throw error;
    }

    console.log('Demo user created successfully:', {
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata.username
    });
  } catch (error) {
    console.error('Failed to create demo user:', error.message);
  }
}

createDemoUser(); 