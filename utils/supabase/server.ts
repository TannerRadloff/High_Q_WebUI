import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // This can happen when cookies are manipulated by middleware or 
            // when the response has already been sent to the client
            console.error('Error setting cookie:', error);
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            // This can happen when cookies are manipulated by middleware or 
            // when the response has already been sent to the client
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
}; 