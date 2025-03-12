'use client';

import React, { Component, ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Special handling for message channel errors
    if (error.message && error.message.includes('message channel closed')) {
      console.error('Message channel closed prematurely. This could be due to network issues or server timeout.');
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Check if the error is related to message channel
      const isMessageChannelError = this.state.error?.message?.includes('message channel closed');
      
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTitle>
            {isMessageChannelError ? 'Communication Error' : 'Something went wrong'}
          </AlertTitle>
          <AlertDescription className="mt-2">
            {isMessageChannelError ? (
              <>
                <p>The connection with the server was interrupted. This could be due to:</p>
                <ul className="list-disc pl-5 mt-2 mb-4">
                  <li>Network instability</li>
                  <li>Server timeout</li>
                  <li>Page navigation during response</li>
                </ul>
              </>
            ) : (
              <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
            )}
            
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={this.handleReset}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary }; 