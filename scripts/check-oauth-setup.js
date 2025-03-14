/**
 * Script to verify OAuth setup with Supabase
 * 
 * This script will:
 * 1. Check if Supabase environment variables are configured
 * 2. Generate a test OAuth URL using the Supabase API
 * 3. Verify that the redirect URL is properly configured
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkSupabaseOAuthSetup() {
  console.log('\n=== Supabase OAuth Configuration Check ===\n');
  
  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing Supabase environment variables.');
    console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.');
    return;
  }
  
  console.log('✅ Environment variables found:');
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 25)}...`);
  console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 5)}...`);
  console.log(`- NEXT_PUBLIC_APP_URL: ${appUrl}`);
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate the redirect URL
    const redirectUrl = `${appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl}/auth/callback`;
    console.log(`\n🔗 Using redirect URL: ${redirectUrl}`);
    
    // Generate a test OAuth URL (doesn't actually redirect)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true, // Don't actually redirect
      }
    });
    
    if (error) {
      console.error('\n❌ Supabase returned an error when generating OAuth URL:');
      console.error(`- Error: ${error.message}`);
      console.log('\nThis may indicate that your Supabase project is not properly configured for OAuth.');
      return;
    }
    
    if (!data || !data.url) {
      console.error('\n❌ Supabase did not return a valid OAuth URL.');
      return;
    }
    
    console.log('\n✅ Successfully generated a test OAuth URL!');
    
    // Check if our redirect URL is in the generated URL
    const oauthUrl = new URL(data.url);
    const redirectParam = oauthUrl.searchParams.get('redirect_to');
    
    if (redirectParam && redirectParam === redirectUrl) {
      console.log('✅ The redirect URL is correctly included in the OAuth flow.');
    } else {
      console.log('\n⚠️ Warning: The redirect URL does not match what was expected.');
      console.log(`- Expected: ${redirectUrl}`);
      console.log(`- Found: ${redirectParam || 'Not found'}`);
      console.log('\nThis may cause OAuth login to fail. Please verify your Supabase configuration.');
    }
    
    console.log('\n=== OAuth URL Details ===');
    console.log('Here is the generated OAuth URL (for debugging purposes):');
    console.log(data.url);
    
    console.log('\n=== Next Steps ===');
    console.log('1. Ensure the exact redirect URL above is configured in both:');
    console.log('   - Supabase Authentication → URL Configuration → Redirect URLs');
    console.log('   - Google Cloud Console → OAuth 2.0 Client ID → Authorized redirect URIs');
    console.log('2. Make sure the site URL is set to your base URL in Supabase');
    console.log('3. Check that your Google OAuth Client ID and Secret are configured in Supabase');
    
  } catch (err) {
    console.error('\n❌ Error while verifying OAuth setup:');
    console.error(err);
  }
}

// Run the check
checkSupabaseOAuthSetup()
  .then(() => console.log('\nCheck completed.'))
  .catch(err => console.error('Unexpected error:', err)); 