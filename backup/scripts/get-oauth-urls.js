/**
 * Script to generate OAuth redirect URLs for configuration
 * 
 * This script will:
 * 1. Check the current environment (local or deployed)
 * 2. Generate the appropriate redirect URLs for Supabase and Google OAuth
 * 3. Display them in a format that can be easily copied and pasted
 */

// Load environment variables
require('dotenv').config();

function getBaseUrl() {
  // Check for environment variable first
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    console.log(`Found NEXT_PUBLIC_APP_URL environment variable: ${envUrl}`);
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // If running in local environment
  console.log('No NEXT_PUBLIC_APP_URL environment variable found, using localhost:3000');
  return 'http://localhost:3000';
}

function createRedirectUrl(baseUrl, path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function generateOAuthUrls() {
  console.log('\n=== OAuth Redirect URLs ===\n');
  
  // Get the deployed URL (or localhost if not deployed)
  const baseUrl = getBaseUrl();
  console.log(`\nBase URL detected: ${baseUrl}`);
  
  // Check Supabase environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('\n⚠️ Warning: Supabase environment variables are missing.');
    console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.');
  } else {
    console.log('\n✅ Supabase environment variables found.');
  }
  
  console.log('\nThese URLs should be used for your OAuth configuration:\n');

  // Main redirect URL for OAuth callbacks
  const mainRedirectUrl = createRedirectUrl(baseUrl, '/auth/callback');
  console.log('1. Main OAuth Redirect URL (Supabase and Google):');
  console.log(`   ${mainRedirectUrl}`);
  
  // Additional URLs for Google OAuth (needed in some cases)
  console.log('\n2. Additional URLs for Google OAuth Console:');
  console.log(`   ${baseUrl}`);
  console.log(`   ${baseUrl}/`);
  
  console.log('\n3. Supabase Site URL (ensure this is set in Supabase dashboard):');
  console.log(`   ${baseUrl}`);
  
  console.log('\n=== Instructions ===\n');
  console.log('For Supabase:');
  console.log('1. Go to Authentication → URL Configuration');
  console.log('2. Set Site URL to the value in section 3');
  console.log('3. Add the URL from section 1 to Redirect URLs');
  console.log('4. Save changes');
  
  console.log('\nFor Google OAuth:');
  console.log('1. Go to Google Cloud Console → APIs & Services → Credentials');
  console.log('2. Edit your OAuth 2.0 Client ID');
  console.log('3. Add all URLs from sections 1 and 2 to Authorized redirect URIs');
  console.log('4. Save changes');
  
  console.log('\nIMPORTANT: After updating these configurations, you may need to:');
  console.log('- Clear browser cookies for your application');
  console.log('- Wait a few minutes for changes to propagate');
  console.log('- Restart your application server');
}

// Run the function
generateOAuthUrls(); 