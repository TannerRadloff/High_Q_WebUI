'use client';

import { useEffect } from 'react';

// Add global error handler for message channel errors
const initGlobalErrorHandlers = () => {
  if (typeof window !== 'undefined') {
    // Capture and log unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && 
          event.reason.message && 
          event.reason.message.includes('message channel closed')) {
        console.error('Global handler: Message channel closed error:', event.reason);
        // We don't prevent default here to allow error boundaries to catch it
      }
    });
  }
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize global error handlers
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  return <>{children}</>;
} 

