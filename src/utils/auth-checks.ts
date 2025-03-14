/**
 * Utility functions for authentication-related checks and error handling
 */

// Centralized function to check if an error is auth-related
export function isAuthenticationError(error: any): boolean {
  if (!error) return false;
  
  // Check common patterns for auth errors in error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('auth') || 
           message.includes('unauthorized') || 
           message.includes('unauthenticated') ||
           message.includes('permission') ||
           message.includes('forbidden') ||
           message.includes('login') ||
           message.includes('sign in');
  }
  
  // Check if it's a string error message
  if (typeof error === 'string') {
    const message = error.toLowerCase();
    return message.includes('auth') || 
           message.includes('unauthorized') || 
           message.includes('unauthenticated') ||
           message.includes('permission') ||
           message.includes('forbidden') ||
           message.includes('login') ||
           message.includes('sign in');
  }
  
  // Check for API status codes
  if (error && typeof error === 'object') {
    // Handle Fetch API responses or objects with status properties
    if (error.status === 401 || error.status === 403) {
      return true;
    }
  }
  
  return false;
}

// Helper to dispatch global error event for authentication
export function dispatchAuthRequiredEvent(errorMessage?: string): void {
  if (typeof window === 'undefined') return;
  
  const errorEvent = new CustomEvent('historyLoadError', { 
    detail: { 
      type: 'authentication-required',
      message: errorMessage || 'Authentication required to proceed',
      timestamp: new Date().toISOString()
    } 
  });
  
  document.dispatchEvent(errorEvent);
}

// Helper to dispatch global error event for non-auth errors
export function dispatchErrorEvent(errorMessage?: string): void {
  if (typeof window === 'undefined') return;
  
  const errorEvent = new CustomEvent('historyLoadError', { 
    detail: { 
      type: 'loading-error',
      message: errorMessage || 'An error occurred',
      timestamp: new Date().toISOString()
    } 
  });
  
  document.dispatchEvent(errorEvent);
}

// Function that handles API errors and dispatches appropriate events
export function handleAPIError(error: any, context?: string): void {
  // Log the error
  console.error(`[API Error] ${context || ''}:`, error);
  
  // Check if it's an auth error and dispatch appropriate event
  if (isAuthenticationError(error)) {
    dispatchAuthRequiredEvent(error instanceof Error ? error.message : String(error));
  } else {
    dispatchErrorEvent(error instanceof Error ? error.message : String(error));
  }
} 