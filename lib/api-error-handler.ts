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

// Error type determination
export function categorizeError(error: unknown): string {
  const errorMessage = error instanceof Error 
    ? error.message.toLowerCase()
    : String(error).toLowerCase();
  
  // Network errors
  if (
    errorMessage.includes('network') || 
    errorMessage.includes('fetch') || 
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network request failed')
  ) {
    return ERROR_TYPES.NETWORK;
  }
  
  // Timeout errors
  if (
    errorMessage.includes('timeout') || 
    errorMessage.includes('timed out') ||
    errorMessage.includes('deadline exceeded')
  ) {
    return ERROR_TYPES.TIMEOUT;
  }
  
  // Authentication errors
  if (
    errorMessage.includes('auth') || 
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('access denied') ||
    errorMessage.includes('not allowed') ||
    errorMessage.includes('api key')
  ) {
    return ERROR_TYPES.AUTH;
  }
  
  // Rate limit errors
  if (
    errorMessage.includes('rate limit') || 
    errorMessage.includes('quota') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('429')
  ) {
    return ERROR_TYPES.RATE_LIMIT;
  }
  
  // Server errors
  if (
    errorMessage.includes('server error') || 
    errorMessage.includes('500') ||
    errorMessage.includes('503') ||
    errorMessage.includes('internal server')
  ) {
    return ERROR_TYPES.SERVER;
  }
  
  // Validation errors
  if (
    errorMessage.includes('validation') || 
    errorMessage.includes('invalid') ||
    errorMessage.includes('required field') ||
    errorMessage.includes('missing') ||
    errorMessage.includes('bad request') ||
    errorMessage.includes('400')
  ) {
    return ERROR_TYPES.VALIDATION;
  }
  
  // Default to unknown
  return ERROR_TYPES.UNKNOWN;
}

// User-friendly error messages for each error type
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Network connection issue. Please check your internet connection and try again.',
  [ERROR_TYPES.TIMEOUT]: 'Request timed out. The server took too long to respond.',
  [ERROR_TYPES.AUTH]: 'Authentication error. Please try refreshing the page or logging in again.',
  [ERROR_TYPES.RATE_LIMIT]: 'Rate limit exceeded. Please wait a moment before trying again.',
  [ERROR_TYPES.SERVER]: 'Server error. We\'re experiencing technical difficulties. Please try again later.',
  [ERROR_TYPES.VALIDATION]: 'Invalid request. Please check your input and try again.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Normalize error for logging
export function normalizeError(error: unknown): { message: string; details: any } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
        cause: error.cause
      }
    };
  }
  
  if (error && typeof error === 'object') {
    return {
      message: String(error),
      details: error
    };
  }
  
  return {
    message: String(error),
    details: { original: error }
  };
}

// Enhanced console error logging
export function logError(error: unknown, context: string = ''): void {
  const { message, details } = normalizeError(error);
  const errorType = categorizeError(error);
  
  console.error(`[ERROR${context ? ` - ${context}` : ''}] ${message}`, {
    errorType,
    details,
    timestamp: new Date().toISOString()
  });
  
  // Log additional details for network errors
  if (errorType === ERROR_TYPES.NETWORK) {
    console.error('Network status:', navigator.onLine ? 'online' : 'offline');
  }
}

// Get user-friendly message based on error type
export function getUserErrorMessage(error: unknown): string {
  const errorType = categorizeError(error);
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
}

// Accept either a string message or an error object
export type ErrorInput = string | Error | unknown;

// Convert any error input to a standard format
export function normalizeErrorInput(input: ErrorInput): unknown {
  if (typeof input === 'string') {
    return new Error(input);
  }
  return input;
}

// Show toast with appropriate error message
export function showErrorToast(errorInput: ErrorInput): string | number {
  const error = normalizeErrorInput(errorInput);
  const errorType = categorizeError(error);
  const message = getUserErrorMessage(error);
  
  // Log the error
  logError(error);
  
  // Show toast with appropriate duration based on error type
  return toast.error(message, {
    // More important errors stay longer
    duration: errorType === ERROR_TYPES.UNKNOWN ? 8000 : 5000,
    id: `error-${errorType}`, // Using ID helps prevent duplicates
  });
}

// Track and deduplicate errors
let lastErrorMessage = '';
let lastErrorToastId: string | number | null = null;

// Show error toast only if not a duplicate of the most recent error
export function showUniqueErrorToast(errorInput: ErrorInput): string | number | null {
  const error = normalizeErrorInput(errorInput);
  const message = getUserErrorMessage(error);
  
  // Skip if same as last error
  if (message === lastErrorMessage) {
    return null;
  }
  
  // Update last error
  lastErrorMessage = message;
  
  // Dismiss previous error toast if exists
  if (lastErrorToastId) {
    toast.dismiss(lastErrorToastId);
  }
  
  // Show new toast and track its ID
  lastErrorToastId = showErrorToast(error);
  return lastErrorToastId;
}

// Reset error tracking state
export function resetErrorTracking(): void {
  lastErrorMessage = '';
  if (lastErrorToastId) {
    toast.dismiss(lastErrorToastId);
    lastErrorToastId = null;
  }
} 