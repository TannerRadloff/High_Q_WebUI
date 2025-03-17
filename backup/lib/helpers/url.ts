/**
 * Helper functions for URL handling across different deployment environments
 */

/**
 * Get the base URL for the application
 * Uses the browser's current location when available, avoiding dependency on environment variables
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }
  
  // Client-side: always use the current window location origin to avoid mismatches
  return window.location.origin;
}

/**
 * Create a full URL by combining the base URL with a path
 * @param path - The path to append to the base URL
 * @returns The complete URL
 */
export function createUrl(path: string): string {
  const baseUrl = getBaseUrl();
  
  // Handle cases where baseUrl might be empty or missing trailing slash
  if (!baseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Get the appropriate domain for cookies
 * Uses the current hostname to avoid domain mismatches
 * @returns The domain to use for cookies
 */
export function getCookieDomain(): string {
  if (typeof window === 'undefined') {
    // Server-side: we can't determine this without the request
    return '';
  }
  
  const hostname = window.location.hostname;
  
  // For localhost development, use the full hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return hostname;
  }
  
  // For deployed environments, just use the current hostname directly
  // to ensure domain matches and avoid cross-domain cookie issues
  return hostname;
}

/**
 * Get the redirect URL for OAuth callbacks
 * @returns The full callback URL
 */
export function getOAuthRedirectUrl(): string {
  return createUrl('/auth/callback');
} 