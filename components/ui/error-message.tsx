import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/button';

// Define common error types
export type ErrorType = 'general' | 'authentication' | 'network' | 'validation' | 'server';

interface ErrorMessageProps {
  type: ErrorType;
  message?: string;
  onRetry?: () => void;
  onLogin?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const defaultMessages = {
  general: 'An error occurred. Please try again.',
  authentication: 'Authentication required. Please sign in to continue.',
  network: 'Network connection issue. Please check your connection.',
  validation: 'Invalid request. Please check your input.',
  server: 'Server error. Our team has been notified.',
};

export function ErrorMessage({
  type = 'general',
  message,
  onRetry,
  onLogin,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  // Use the provided message or fall back to the default for the error type
  const displayMessage = message || defaultMessages[type] || defaultMessages.general;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`error-container ${className}`}
      role="alert"
    >
      <div className="flex-row-center justify-start">
        <div className="flex-1">
          <p className="text-sm text-destructive font-medium">{displayMessage}</p>
        </div>
        {onDismiss && (
          <button 
            className="ml-4 text-muted-foreground hover:text-destructive transition-colors"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      
      {(onRetry || onLogin) && (
        <div className="mt-2 flex-row gap-2">
          {onRetry && (
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
              className="px-3 py-1 h-auto text-xs"
            >
              Try Again
            </Button>
          )}
          
          {onLogin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLogin}
              className="px-3 py-1 h-auto text-xs"
            >
              Sign In
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
} 