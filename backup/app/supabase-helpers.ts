// Import clients from their original files with renamed imports
import { createClient as createBrowserClient } from './supabase/client';
import { createClient as createServerClient } from './supabase/server';
import { createClient as createMiddlewareClient } from './supabase/middleware';

// Export all with unique names
export {
  createBrowserClient,
  createServerClient,
  createMiddlewareClient
}; 