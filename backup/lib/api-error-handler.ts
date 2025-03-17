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

/**
 * Maps error types to user-friendly messages
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Unable to connect to the server. Please check your internet connection.',
  [ERROR_TYPES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_TYPES.AUTH]: 'Authentication required. Please sign in.',
  [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please try again later.',
  [ERROR_TYPES.SERVER]: 'Server error. Our team has been notified.',
  [ERROR_TYPES.VALIDATION]: 'Invalid input. Please check your data.',
  [ERROR_TYPES.UNKNOWN]: 'An error occurred. Please try again.'
};

/**
 * Determine the error type from a given error
 */
function getErrorType(error: unknown): string {
  if (!error) return ERROR_TYPES.UNKNOWN;
  
  // Handle Fetch API network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_TYPES.NETWORK;
  }
  
  // Handle error objects with status codes
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Authentication errors
    if (err.status === 401 || err.status === 403 || err.statusCode === 401 || err.statusCode === 403) {
      return ERROR_TYPES.AUTH;
    }
    
    // Rate limiting
    if (err.status === 429 || err.statusCode === 429) {
      return ERROR_TYPES.RATE_LIMIT;
    }
    
    // Server errors
    if ((err.status && err.status >= 500) || (err.statusCode && err.statusCode >= 500)) {
      return ERROR_TYPES.SERVER;
    }
    
    // Validation errors
    if ((err.status === 400 || err.statusCode === 400) && err.validation) {
      return ERROR_TYPES.VALIDATION;
    }
    
    // Timeout errors
    if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      return ERROR_TYPES.TIMEOUT;
    }
  }
  
  return ERROR_TYPES.UNKNOWN;
}

/**
 * Convert an error to a user-friendly message
 */
function getUserErrorMessage(error: unknown): string {
  if (!error) return ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle error objects
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Use provided error message if available
    if (err.message) {
      return err.message;
    }
    
    // Use statusText for HTTP errors
    if (err.statusText) {
      return `Error: ${err.statusText}`;
    }
  }
  
  // Use error type mapping for standard messages
  const errorType = getErrorType(error);
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
}

/**
 * Log errors to the console in development
 */
function logError(error: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[API Error]', error);
  }
}

// Toast notification debouncing cache - track recent toasts to prevent duplicates
const recentToasts: Record<string, number> = {};
const DEFAULT_DEBOUNCE_MS = 2000; // Default 2-second debounce

/**
 * Centralized toast notification system
 */
export const notifications = {
  /**
   * Show error toast with debouncing
   */
  error: (message: string, options?: { id?: string; duration?: number; debounceMs?: number }) => {
    logError(message);
    return showToast('error', message, options);
  },
  
  /**
   * Show success toast with debouncing
   */
  success: (message: string, options?: { id?: string; duration?: number; debounceMs?: number }) => {
    return showToast('success', message, options);
  },
  
  /**
   * Show info toast with debouncing
   */
  info: (message: string, options?: { id?: string; duration?: number; debounceMs?: number }) => {
    return showToast('info', message, options);
  },
  
  /**
   * Show warning toast with debouncing
   */
  warning: (message: string, options?: { id?: string; duration?: number; debounceMs?: number }) => {
    return showToast('warning', message, options);
  },
  
  /**
   * Show loading toast
   */
  loading: (message: string, options?: { id?: string; duration?: number }) => {
    return toast.loading(message, options);
  },
  
  /**
   * Dismiss a toast by ID
   */
  dismiss: (id: string) => {
    delete recentToasts[id];
    return toast.dismiss(id);
  },
  
  /**
   * Show promise toast with loading, success, and error states
   */
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
      id?: string;
    }
  ) => {
    return toast.promise(promise, options);
  }
};

/**
 * Helper function to show toasts with debouncing
 */
function showToast(
  type: 'error' | 'success' | 'info' | 'warning',
  message: string,
  options?: { id?: string; duration?: number; debounceMs?: number }
) {
  const id = options?.id || message;
  const now = Date.now();
  const debounceMs = options?.debounceMs || DEFAULT_DEBOUNCE_MS;
  
  // Check if we've shown this toast recently
  if (recentToasts[id] && now - recentToasts[id] < debounceMs) {
    return null; // Skip showing duplicate toast
  }
  
  // Update the timestamp for this toast ID
  recentToasts[id] = now;
  
  // Show the toast with the appropriate type
  return toast[type](message, { id, duration: options?.duration || 5000 });
}

/**
 * Show error toast for any error object
 */
export function showErrorToast(error: unknown, options?: { id?: string; duration?: number; debounceMs?: number }) {
  logError(error);
  const message = getUserErrorMessage(error);
  return notifications.error(message, options);
}

// For backward compatibility
export const showUniqueErrorToast = showErrorToast; 