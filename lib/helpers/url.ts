/**
 * Helper functions for URL handling across different deployment environments
 */

/**
 * Get the base URL for the application
 * Uses the NEXT_PUBLIC_APP_URL environment variable if available,
 * otherwise falls back to the current origin
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable
    return process.env.NEXT_PUBLIC_APP_URL || '';
  }
  
  // Client-side: use environment variable or fall back to window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
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
 * For non-localhost environments, extracts the domain from NEXT_PUBLIC_APP_URL
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
  
  // For deployed environments, try to use the main domain from APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      return url.hostname;
    } catch (e) {
      console.warn('Failed to parse NEXT_PUBLIC_APP_URL:', e);
    }
  }
  
  // Fall back to the current hostname
  return hostname;
}

/**
 * Get the redirect URL for OAuth callbacks
 * @returns The full callback URL
 */
export function getOAuthRedirectUrl(): string {
  return createUrl('/auth/callback');
} 