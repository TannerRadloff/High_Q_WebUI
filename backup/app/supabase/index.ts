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