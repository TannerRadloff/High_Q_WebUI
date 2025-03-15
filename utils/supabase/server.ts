import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
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
    return createServerClient(
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
}; 