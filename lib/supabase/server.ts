import { createServerComponentClient, createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { cache } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'

// Cache the client creation to improve performance
export const getSupabaseServerClient = cache(async () => {
  // Use the auth-helpers-nextjs package which has better compatibility
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  try {
    // Verify the session - log info but don't throw to prevent page crashes
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting server session:', error.message)
    } else {
      if (data.session) {
        console.log('Server session found, user authenticated')
      } else {
        console.log('No server session found, user not authenticated')
      }
    }
    
    return supabase
  } catch (err) {
    console.error('Unexpected error in getSupabaseServerClient:', err)
    // Still return the client even if session check fails
    return supabase
  }
})

// Server action client - specifically for use in server actions
export async function getSupabaseActionClient() {
  const cookieStore = cookies()
  return createServerActionClient<Database>({ cookies: () => cookieStore })
}

/**
 * Creates a server component client for Supabase
 * Compatible with the auth-helpers-nextjs API
 */
export function createClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
}

/**
 * Creates a Supabase server client using the @supabase/ssr package
 * This provides better compatibility with newer Supabase features
 * Includes advanced error handling and request timeouts
 */
export async function createServerClient(): Promise<SupabaseClient> {
  try {
    // Ensure environment variables are properly set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.trim() === '') {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() === '') {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    }
    
    const cookieStore = await cookies();
    
    // Create a client with additional options and improved error handling
    return createSSRServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            try {
              const cookie = cookieStore.get(name);
              return cookie?.value;
            } catch (error) {
              console.error(`[Supabase Server] Error getting cookie ${name}:`, error);
              return undefined;
            }
          },
          set(name, value, options) {
            try {
              if (!value) {
                console.warn(`[Supabase Server] Attempted to set empty value for cookie ${name}`);
              }
              cookieStore.set(name, value, options);
            } catch (error) {
              // This can happen when cookies are manipulated by middleware or 
              // when the response has already been sent to the client
              console.error(`[Supabase Server] Error setting cookie ${name}:`, error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (error) {
              // This can happen when cookies are manipulated by middleware or 
              // when the response has already been sent to the client
              console.error(`[Supabase Server] Error removing cookie ${name}:`, error);
            }
          },
        },
        // Add global options for all fetch requests
        global: {
          fetch: (url, options) => {
            // Set a reasonable timeout for Supabase requests
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), 8000); // 8 second timeout
            
            return fetch(url, {
              ...options,
              signal: timeoutController.signal,
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          }
        }
      }
    );
  } catch (error) {
    console.error('[Supabase Server] Error creating client:', error);
    throw error;
  }
} 