import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Export the client modules with specific imports
import { createClient as createBrowserClient } from './client';
import { createClient as createServerClient } from './server';
import { createClient as createMiddlewareClient } from './middleware';

// Re-export with specific names
export {
  createBrowserClient,
  createServerClient,
  createMiddlewareClient
};

// DO NOT use wildcard exports to avoid naming conflicts
// export * from './client';
// export * from './server';
// export * from './middleware'; 