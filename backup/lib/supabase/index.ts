// Export all client creation methods from a single file
import { createClient as createBrowserClient, createBrowserSupabaseClient } from './client';
import { createClient as createServerClientComponent, createServerClient as createSSRServerClient, getSupabaseServerClient, getSupabaseActionClient } from './server';
import { createMiddlewareClient, createClient as createMiddlewareClientAlias } from './middleware';
import { createPagesApiClient, createServiceRoleClient } from './pages-compatibility';

// Export with consistent naming for all contexts
export {
  // Browser/client component clients
  createBrowserClient,
  createBrowserSupabaseClient,
  
  // Server clients
  createServerClientComponent,
  createSSRServerClient,
  getSupabaseServerClient,
  getSupabaseActionClient,
  
  // Middleware clients
  createMiddlewareClient,
  createMiddlewareClientAlias,
  
  // Pages compatibility clients 
  createPagesApiClient,
  createServiceRoleClient
};

// Default export for easy importing
export default {
  createBrowserClient,
  createServerClientComponent,
  createMiddlewareClient,
  getSupabaseServerClient,
  getSupabaseActionClient,
  createPagesApiClient,
  createServiceRoleClient
}; 