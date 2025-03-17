import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from '@/types/supabase';

// Type definition for Request cookies based on NextJS docs
interface RequestCookie {
  name: string;
  value: string;
}

/**
 * Creates a Supabase client for use in middleware
 * Returns both the client and the modified response object
 */
export const createMiddlewareClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // NextRequest.cookies.get() returns a RequestCookie object or undefined
          const cookie = request.cookies.get(name) as RequestCookie | undefined;
          return cookie?.value;
        },
        set(name: string, value: string, options) {
          // This is called when the auth state changes
          response.headers.append(
            'Set-Cookie',
            `${name}=${value}; Path=/; ${options?.maxAge ? `Max-Age=${options.maxAge};` : ''}`
          );
        },
        remove(name: string, options) {
          // This is called when the auth state changes
          response.headers.append(
            'Set-Cookie',
            `${name}=; Path=/; Max-Age=0;`
          );
        },
      },
    }
  );

  return { supabase, response };
};

// Alias for compatibility with legacy code
export const createClient = createMiddlewareClient; 