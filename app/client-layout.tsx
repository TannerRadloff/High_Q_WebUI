'use client';

import { useEffect } from 'react';
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
  // Only consider /chat/* paths as chat pages, not the root path
  return pathname.startsWith('/chat');
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize global error handlers
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  const pathname = usePathname();
  const isAuth = isAuthPage(pathname);
  const isChat = isChatPage(pathname);
  const isHome = pathname === '/';

  return (
    <div className={cn(
      "w-full", 
      isAuth && "flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]",
      isChat && "h-full", // Chat pages don't need extra height adjustment as they have their own layout
      isHome && "h-full" // Home page should have the same height handling as chat pages
    )}>
      {children}
    </div>
  );
} 

