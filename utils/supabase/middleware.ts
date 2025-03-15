import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
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