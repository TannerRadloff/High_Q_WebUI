import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { getCookieDomain } from '../helpers/url'

// Cache the client instance to avoid creating multiple instances
let cachedClient: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export const createClient = () => {
  // If we already have a client instance, return it
  if (cachedClient) {
    return cachedClient;
  }
  
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Debug Supabase environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing:', {
      urlAvailable: !!supabaseUrl,
      keyAvailable: !!supabaseKey,
      appUrlAvailable: !!appUrl
    })
  } else {
    console.log('Supabase client initialized with env variables')
  }
  
  try {
    // Get the consistent cookie domain using our helper
    const cookieDomain = getCookieDomain();
    console.log(`Using cookie domain: ${cookieDomain}`);
    
    // Create the client with custom cookie settings to handle deployment URLs
    cachedClient = createClientComponentClient<Database>({
      cookieOptions: {
        name: 'sb-auth-token',
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: isBrowser ? window.location.protocol === 'https:' : true
      }
    });
    
    // Log the session status on client creation
    if (cachedClient && isBrowser) {
      cachedClient.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error('Error checking session:', error)
        } else {
          console.log('Session available on client creation:', !!data.session)
          if (data.session && data.session.expires_at) {
            // Print debug information about the session
            console.log('Session expires at:', new Date(data.session.expires_at * 1000).toISOString())
            console.log('Current time:', new Date().toISOString())
            console.log('Cookie domain being used:', cookieDomain)
            
            // Log cookie information if in browser
            if (typeof document !== 'undefined') {
              const cookies = document.cookie.split(';').map(cookie => cookie.trim());
              console.log('Browser cookies:', cookies.filter(c => 
                c.startsWith('sb-') || c.includes('supabase') || c.includes('auth')
              ));
            }
          }
        }
      }).catch(err => {
        console.error('Unexpected error checking session:', err)
      });
    }
    
    return cachedClient;
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error;
  }
} 