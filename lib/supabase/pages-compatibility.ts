/**
 * Supabase Client for Pages Directory
 * ===================================
 * 
 * This file provides compatibility with the older pages directory structure.
 * It specifically avoids using `next/headers` which is only available in App Router.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type CookieOptions, createServerClient as createServerSSRClient } from '@supabase/ssr'
import { type Database } from '@/types/supabase'

/**
 * Create a Supabase client for use in pages API routes
 * This is safe to use in the pages directory as it doesn't use next/headers
 */
export function createPagesApiClient(context: {
  req: {
    cookies: {
      [key: string]: string
    }
  }
  res: {
    setHeader: (name: string, value: string[]) => void
  }
}) {
  return createServerSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          // Parse the cookies
          const cookieStr = `${name}=${value}; Path=${options.path ?? '/'}`
            + (options.maxAge ? `; Max-Age=${options.maxAge}` : '')
            + (options.domain ? `; Domain=${options.domain}` : '')
            + (options.secure ? '; Secure' : '')
            + (options.sameSite ? `; SameSite=${options.sameSite}` : '');
          
          context.res.setHeader('Set-Cookie', [cookieStr])
        },
        remove(name: string, options: CookieOptions) {
          // Set an expired cookie
          const cookieStr = `${name}=; Path=${options.path ?? '/'}`
            + `; Max-Age=0`
            + (options.domain ? `; Domain=${options.domain}` : '')
            + (options.secure ? '; Secure' : '')
            + (options.sameSite ? `; SameSite=${options.sameSite}` : '');
            
          context.res.setHeader('Set-Cookie', [cookieStr])
        },
      },
    }
  )
}

/**
 * Create a Supabase service role client for admin operations
 * This is for server-side only and bypasses RLS
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} 