require('dotenv').config();

console.log('Environment variables test:');
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Let's manually set the URLs based on what we can determine
const deployedUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextjs-ai-chatbot-seven-lovat-14.vercel.app';
console.log('\n=== OAuth Redirect URLs ===\n');
console.log('For your Supabase dashboard, use these URLs:');
console.log('Site URL:', deployedUrl);
console.log('Redirect URL:', `${deployedUrl}/auth/callback`);

console.log('\nFor Google OAuth Console, add these redirect URIs:');
console.log(`${deployedUrl}/auth/callback`);
console.log(`${deployedUrl}/`);
console.log(`${deployedUrl}`); 