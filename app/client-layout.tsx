'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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

function isAuthPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/login') || 
         pathname.startsWith('/register') || 
         pathname.startsWith('/forgot-password') ||
         pathname.startsWith('/reset-password');
}

function isChatPage(pathname: string | null) {
  if (!pathname) return false;
  // Consider both /chat/* paths and home page as chat pages
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

  return (
    <ErrorBoundary>
      <div className={cn(
        "w-full", 
        isAuth && "flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]",
        isChat && "h-full" // Chat pages (including home) don't need extra height adjustment
      )}>
        {children}
      </div>
    </ErrorBoundary>
  );
} 

