/**
 * Supabase Server Client
 * ======================
 * 
 * This file provides server-side Supabase client functionality.
 * To avoid build issues between App Router and Pages Router,
 * we dynamically import the parts that use next/headers.
 */

import { createServerComponentClient, createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { type CookieOptions } from '@supabase/ssr'

// Memory store for fallback when cookies are unavailable
const memoryStore = new Map<string, string>();

/**
 * Server action client - specifically for use in server actions
 * This uses a dynamic import to avoid importing next/headers directly
 */
export async function getSupabaseActionClient() {
  // Dynamically import to avoid the direct import of next/headers
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  return createServerActionClient<Database>({ cookies: () => cookieStore });
}

/**
 * Creates a Supabase server client using the @supabase/ssr package
 * This provides better compatibility with newer Supabase features
 * Uses a dynamic import to avoid importing next/headers directly
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

    const { cookies } = await import('next/headers');
    
    const client = createSSRServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name: string) => {
            return cookies().get(name)?.value
          },
          set: (name: string, value: string, options: CookieOptions) => {
            try {
              cookies().set(name, value, options)
            } catch (error) {
              // This can happen when cookies are set in middleware
              console.error(`[Supabase Server] Error setting cookie ${name}:`, error);
            }
          },
          remove: (name: string, options: CookieOptions) => {
            try {
              cookies().set(name, '', { ...options, maxAge: 0 })
            } catch (error) {
              // This can happen when cookies are removed in middleware
              console.error(`[Supabase Server] Error removing cookie ${name}:`, error);
            }
          }
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          fetch: (url, options) => {
            // Set a reasonable timeout for Supabase requests
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => {
              console.warn(`[Supabase Server] Request timeout for URL: ${url}`);
              timeoutController.abort();
            }, 10000); // 10 second timeout
            
            // Add cache control headers to avoid stale data
            const headers = new Headers(options?.headers || {});
            headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            headers.set('Pragma', 'no-cache');
            headers.set('Expires', '0');
            
            return fetch(url, {
              ...options,
              headers,
              signal: timeoutController.signal,
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          }
        }
      }
    );

    return client;
  } catch (error) {
    console.error('[Supabase Server] Error creating client:', error);
    throw error;
  }
}

/**
 * LEGACY METHODS
 * These are kept for backward compatibility but use dynamic imports
 * to avoid direct reference to next/headers
 */

// Cache the Supabase client for server components
let serverComponentClientCache: any = null;

// Get a cached server component client
export async function getSupabaseServerClient() {
  if (serverComponentClientCache) return serverComponentClientCache;

  // Dynamically import to avoid the direct import of next/headers
  const { cookies } = await import('next/headers');
  const { createServerComponentClient } = await import('@supabase/auth-helpers-nextjs');
  const { cache } = await import('react');

  // Create a cached version of the getter
  const cachedGetter = cache(async () => {
    const cookieStore = cookies();
    return createServerComponentClient<Database>({ cookies: () => cookieStore });
  });

  // Get the client
  serverComponentClientCache = await cachedGetter();
  return serverComponentClientCache;
}

// Creates a server component client
export async function createClient() {
  // Dynamically import to avoid the direct import of next/headers
  const { cookies } = await import('next/headers');
  const { createServerComponentClient } = await import('@supabase/auth-helpers-nextjs');

  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
} 