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
  
  // Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing')
    throw new Error('Missing Supabase configuration')
  }
  
  try {
    // Get the cookie domain using the helper (always from current location)
    const cookieDomain = getCookieDomain();
    
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
    
    return cachedClient;
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error;
  }
} 