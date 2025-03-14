'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Check for OpenAI API key error
      const isOpenAIError = this.state.error?.message?.includes('OPENAI_API_KEY') || 
                           this.state.error?.message?.includes('OpenAI');
      
      if (isOpenAIError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
            <div className="w-full max-w-md p-6 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-3">
                OpenAI API Configuration Error
              </h2>
              <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                {this.state.error?.message || 'The OpenAI API key is missing or invalid.'}
              </p>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded border border-red-200 dark:border-red-900 text-xs text-left overflow-auto max-h-32 mb-4">
                <pre className="whitespace-pre-wrap">
                  To fix this issue:
                  
                  1. Add your OpenAI API key to .env.local
                  2. Make sure the key is valid and not expired
                  3. Restart the application
                </pre>
              </div>
              <p className="text-xs text-red-500 dark:text-red-400">
                For more information, check the server logs or the browser console.
              </p>
            </div>
          </div>
        );
      }
      
      // Default error fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
} 