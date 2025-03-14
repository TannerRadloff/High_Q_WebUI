'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
import { useAuth } from '@/components/auth/auth-provider';

// Initialize global error handlers
function initGlobalErrorHandlers() {
  // Error handling for fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Handle authentication errors consistently
      if (response.status === 401 || response.status === 403) {
        // Dispatch custom event for auth errors
        const event = new CustomEvent('authError', {
          detail: { url: args[0], status: response.status }
        });
        document.dispatchEvent(event);
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };
  
  // Listen for custom auth errors
  document.addEventListener('authError', (e: any) => {
    console.log('Auth error detected:', e.detail);
    // Let the auth provider handle redirects
  });
}

// Helper functions for path types
function isAuthPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/login') || 
         pathname.startsWith('/signup') || 
         pathname.startsWith('/register') || 
         pathname.startsWith('/forgot-password') ||
         pathname.startsWith('/reset-password');
}

function isChatPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/chat') || pathname === '/';
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isLoading: isAuthLoading } = useAuth();

  // Call all useEffect hooks together, before any conditional return
  useEffect(() => {
    setMounted(true);
    
    // Initialize global error handlers
    initGlobalErrorHandlers();
    
    return () => {
      // Any cleanup if needed
    };
  }, []);

  // Don't render anything until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  const isAuth = isAuthPage(pathname);
  const isChat = isChatPage(pathname);

  // Show loading indicator while auth is loading
  if (isAuthLoading && !isAuth) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn(
        "w-full h-full", 
        isAuth && "flex-center-col min-h-[calc(100vh-3.5rem)]",
        isChat && "h-full" // Chat pages (including home) don't need extra height adjustment
      )}>
        {children}
      </div>
    </ErrorBoundary>
  );
} 

