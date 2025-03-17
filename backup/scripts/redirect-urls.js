try {
  require('dotenv').config();

  // Detected or provided URL
  const deployedUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextjs-ai-chatbot-seven-lovat-14.vercel.app';
  
  // Make sure URL doesn't have trailing slash
  const baseUrl = deployedUrl.endsWith('/') ? deployedUrl.slice(0, -1) : deployedUrl;
  
  // Main redirect URL for OAuth
  const redirectUrl = `${baseUrl}/auth/callback`;
  
  console.error("=====================================================");
  console.error("             OAUTH REDIRECT URL SETUP               ");
  console.error("=====================================================");
  console.error("");
  console.error("1. SUPABASE CONFIGURATION:");
  console.error("---------------------------");
  console.error("Site URL:      " + baseUrl);
  console.error("Redirect URL:  " + redirectUrl);
  console.error("");
  console.error("2. GOOGLE OAUTH CONFIGURATION:");
  console.error("------------------------------");
  console.error("Add these Authorized redirect URIs:");
  console.error("- " + redirectUrl);
  console.error("- " + baseUrl);
  console.error("- " + baseUrl + "/");
  console.error("");
  console.error("=====================================================");
  console.error("                     INSTRUCTIONS                    ");
  console.error("=====================================================");
  console.error("");
  console.error("For Supabase:");
  console.error("1. Go to your Supabase project");
  console.error("2. Navigate to Authentication → URL Configuration");
  console.error("3. Set Site URL to: " + baseUrl);
  console.error("4. Add the following to Redirect URLs: " + redirectUrl);
  console.error("5. Save changes");
  console.error("");
  console.error("For Google OAuth:");
  console.error("1. Go to Google Cloud Console → APIs & Services → Credentials");
  console.error("2. Edit your OAuth 2.0 Client ID");
  console.error("3. Add all the listed redirect URIs to Authorized redirect URIs");
  console.error("4. Save changes");
  console.error("");
  console.error("After making these changes:");
  console.error("1. Clear your browser cookies for " + baseUrl);
  console.error("2. Restart your application");
  console.error("3. Try logging in again");
  console.error("");
} catch (error) {
  console.error("Error generating URLs:", error);
} 