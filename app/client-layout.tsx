'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
import { useAuth } from '@/components/auth/auth-provider';

// Helper functions for path types - using the same definition across the app
function isAuthPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.includes('/login') || 
         pathname.includes('/register') || 
         pathname.includes('/signup') || 
         pathname.includes('/forgot-password') ||
         pathname.includes('/reset-password');
}

function isChatPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/chat') || pathname === '/';
}

function isAgentBuilderPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/agent-builder');
}

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

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Call all hooks at the top level unconditionally
  const { theme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isLoading: isAuthLoading, user } = useAuth();
  
  // Derived state - not hooks
  const isAuth = isAuthPage(pathname);
  const isChat = isChatPage(pathname);
  const isAgentBuilder = isAgentBuilderPage(pathname);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    initGlobalErrorHandlers();
    
    return () => {
      // Any cleanup if needed
    };
  }, []);

  // Auth redirect effect
  useEffect(() => {
    if (mounted && user && isAuth) {
      console.log('Authenticated user on auth page - redirecting to home');
      window.location.href = '/';
    }
  }, [mounted, user, isAuth, pathname]);

  // Render logic - separate from hooks
  if (!mounted) {
    return null;
  }

  if (isAuthLoading && !isAuth) {
    return (
      <div className="flex-center h-full w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn(
        "w-full h-full", 
        isAuth && "flex-center min-h-[calc(100vh-3.5rem)]",
        (isChat || isAgentBuilder) && "h-full" // Chat pages and agent builder pages don't need extra height adjustment
      )}>
        {children}
      </div>
    </ErrorBoundary>
  );
} 

