// Auth Debugging Utilities
// These functions help diagnose and fix common authentication issues

/**
 * Inspect all authentication related cookies
 */
export function inspectAuthCookies(): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name.toLowerCase().includes('auth') || name.toLowerCase().includes('sb-')) {
      cookies[name] = value;
    }
  });
  
  return cookies;
}

/**
 * Clear all authentication related data
 */
export function clearAuthData(): void {
  // Clear auth cookies
  document.cookie.split(';').forEach(cookie => {
    const [name] = cookie.trim().split('=');
    if (name.toLowerCase().includes('auth') || name.toLowerCase().includes('sb-')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    }
  });
  
  // Clear local storage auth data
  Object.keys(localStorage).forEach(key => {
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('supabase') || key.toLowerCase().includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage auth data
  Object.keys(sessionStorage).forEach(key => {
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('supabase') || key.toLowerCase().includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('All authentication data cleared');
}

/**
 * Get Supabase related items from storage
 */
export function getSupabaseStorage(): { 
  localStorage: Record<string, string>,
  sessionStorage: Record<string, string> 
} {
  const localStorageItems: Record<string, string> = {};
  const sessionStorageItems: Record<string, string> = {};
  
  // Check local storage
  Object.keys(localStorage).forEach(key => {
    if (key.toLowerCase().includes('supabase') || key.toLowerCase().includes('sb-')) {
      try {
        localStorageItems[key] = localStorage.getItem(key) || '';
      } catch (e) {
        localStorageItems[key] = 'Error reading value';
      }
    }
  });
  
  // Check session storage
  Object.keys(sessionStorage).forEach(key => {
    if (key.toLowerCase().includes('supabase') || key.toLowerCase().includes('sb-')) {
      try {
        sessionStorageItems[key] = sessionStorage.getItem(key) || '';
      } catch (e) {
        sessionStorageItems[key] = 'Error reading value';
      }
    }
  });
  
  return {
    localStorage: localStorageItems,
    sessionStorage: sessionStorageItems
  };
}

/**
 * Test if the Supabase session refresh will work
 */
export async function testSessionRefresh(supabaseUrl: string, anonKey: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Load the Supabase client dynamically to avoid dependency issues
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create a new client
    const supabase = createClient(supabaseUrl, anonKey);
    
    // Attempt to refresh the session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        success: false,
        message: 'Failed to refresh session',
        details: error
      };
    }
    
    if (!data.session) {
      return {
        success: false,
        message: 'No session found',
        details: data
      };
    }
    
    return {
      success: true,
      message: 'Session refreshed successfully',
      details: {
        expires: data.session.expires_at,
        user: data.session.user?.email || data.session.user?.id
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Exception during refresh',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get all authentication related information for debugging
 */
export function getAuthDebugInfo(): Record<string, any> {
  return {
    cookies: inspectAuthCookies(),
    storage: getSupabaseStorage(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
}

/**
 * Fix common auth issues where cookies and storage are mismatched
 */
export function fixInconsistentAuthState(): boolean {
  try {
    // If we have neither cookies nor storage data, nothing to fix
    const cookies = inspectAuthCookies();
    const storage = getSupabaseStorage();
    
    // No auth data at all
    if (Object.keys(cookies).length === 0 && 
        Object.keys(storage.localStorage).length === 0 && 
        Object.keys(storage.sessionStorage).length === 0) {
      return false;
    }
    
    // If we have inconsistent state (some data but not all), clear everything
    clearAuthData();
    return true;
  } catch (error) {
    console.error('Error fixing auth state:', error);
    return false;
  }
} 