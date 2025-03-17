import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { getCookieDomain } from '../helpers/url'
import { SupabaseClient } from '@supabase/supabase-js'

// Cache client instances to avoid creating multiple instances
let cachedClientComponent: ReturnType<typeof createClientComponentClient<Database>> | null = null;
let cachedBrowserClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client for use in browser/client components
 * This is the primary client creation function for client-side usage
 */
export const createClient = (): ReturnType<typeof createClientComponentClient<Database>> => {
  // If we already have a client instance, return it
  if (cachedClientComponent) {
    return cachedClientComponent;
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
    cachedClientComponent = createClientComponentClient<Database>({
      cookieOptions: {
        name: 'sb-auth-token',
        domain: cookieDomain,
        path: '/',
        sameSite: 'lax',
        secure: isBrowser ? window.location.protocol === 'https:' : true
      }
    });
    
    return cachedClientComponent;
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    throw error;
  }
}

/**
 * Creates a Supabase browser client using the newer @supabase/ssr package
 * This is provided for compatibility with code that expects the SSR client
 */
export const createBrowserSupabaseClient = (): SupabaseClient => {
  // Return cached client if available
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  try {
    // Create the client 
    cachedBrowserClient = createSSRBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    return cachedBrowserClient;
  } catch (error) {
    console.error('Error creating Supabase SSR browser client:', error)
    throw error;
  }
}

// Export an alias for createBrowserSupabaseClient for legacy code
export const createBrowserClient = createBrowserSupabaseClient; 