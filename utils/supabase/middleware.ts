import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// NOTE: There might be linter errors because the types don't match up perfectly with the
// Next.js API, but this code should work at runtime

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // This is used to set cookies from the browser
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          // This is used to delete cookies from the browser
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  return { response, supabase };
}; 