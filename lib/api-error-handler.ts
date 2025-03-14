import { toast } from 'sonner';

// Error type constants to categorize errors
export const ERROR_TYPES = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  AUTH: 'auth',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// Simplified error logging function
export function logError(error: unknown, context?: string) {
  console.error(`[API ERROR]${context ? ` ${context}:` : ''}`, {
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : 'No stack trace available',
    context
  });
}

// Simple categorization for errors
export function categorizeError(error: unknown): string {
  const errorStr = typeof error === 'string' 
    ? error 
    : error instanceof Error 
    ? error.message 
    : JSON.stringify(error);
  
  // Log the error for debugging
  console.log('[API Error] Raw error data:', {
    error,
    errorStr
  });

  if (errorStr.includes('Failed to fetch') || errorStr.includes('NetworkError')) {
    return ERROR_TYPES.NETWORK;
  }
  if (errorStr.includes('401') || errorStr.includes('Unauthorized')) {
    return ERROR_TYPES.AUTH;
  }
  if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
    return ERROR_TYPES.TIMEOUT;
  }
  if (errorStr.includes('rate limit') || errorStr.includes('429')) {
    return ERROR_TYPES.RATE_LIMIT;
  }
  if (errorStr.includes('server error') || errorStr.includes('500')) {
    return ERROR_TYPES.SERVER;
  }
  if (errorStr.includes('validation') || errorStr.includes('400')) {
    return ERROR_TYPES.VALIDATION;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

// Get a user-friendly error message based on the error type
export function getUserErrorMessage(error: unknown): string {
  const errorType = categorizeError(error);
  
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return 'Network connection issue. Please check your internet connection.';
    case ERROR_TYPES.TIMEOUT:
      return 'Request timed out. Please try again.';
    case ERROR_TYPES.AUTH:
      return 'Authentication error. Please login again.';
    case ERROR_TYPES.RATE_LIMIT:
      return 'Too many requests. Please try again later.';
    case ERROR_TYPES.SERVER:
      return 'Server error. We\'re working on fixing it.';
    case ERROR_TYPES.VALIDATION:
      return 'Invalid request. Please check your input.';
    default:
      return error instanceof Error ? error.message : 'An unexpected error occurred.';
  }
}

// Simplified toast function - removes all the tracking logic that might be causing issues
export function showErrorToast(error: unknown) {
  logError(error);
  const message = getUserErrorMessage(error);
  console.log('[API Error] Showing toast with message:', message);
  return toast.error(message, { duration: 5000 });
}

// Reset tracking state
export function resetErrorTracking() {
  // This is now a no-op since we're simplifying the error handling
  console.log('[API Error] Resetting error tracking');
}

// For backward compatibility
export const showUniqueErrorToast = showErrorToast; 