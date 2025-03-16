"use client";

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/app/features/theme-provider/theme-provider';
import { Providers } from './providers';
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
import { NavBar } from '@/src/components/layout/nav-bar';
import { SidebarProvider } from '@/app/features/sidebar/sidebar';
import ClientLayout from './client-layout';

// Helper functions for path types - using the same definition across the app
function isAuthPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.includes('/login') || 
         pathname.includes('/signup') || 
         pathname.includes('/register') ||
         pathname.includes('/forgot-password') ||
         pathname.includes('/reset-password');
}

function isChatPage(pathname: string | null) {
  if (!pathname) return false;
  // Consider both /chat/* paths and home page as chat pages
  return pathname.startsWith('/chat') || pathname === '/';
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  // Call all hooks at the top level unconditionally
  const pathname = usePathname();
  
  // Derived state - not hooks
  const isAuth = isAuthPage(pathname);
  const isChat = isChatPage(pathname);

  return (
    <ErrorBoundary>
      <Providers>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultWidth={280} defaultOpen={isChat}>
            <div className={cn(
              "min-h-screen",
              isAuth ? "flex-center" : "flex-row"
            )}>
              {!isAuth && !isChat && <NavBar />}
              <main className={cn(
                "flex-1 w-full h-full",
                !isAuth && !isChat && "pl-4",
                isAuth && "flex-center w-full"
              )}>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </main>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </Providers>
    </ErrorBoundary>
  );
} 