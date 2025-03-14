"use client";

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/src/components/common/theme-provider';
import { Providers } from './providers';
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
import { NavBar } from '@/src/components/layout/nav-bar';
import { SidebarProvider } from '@/src/components/ui/sidebar';
import ClientLayout from './client-layout';

function isAuthPage(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith('/login') || 
         pathname.startsWith('/signup') || 
         pathname.startsWith('/forgot-password') ||
         pathname.startsWith('/reset-password');
}

function isChatPage(pathname: string | null) {
  if (!pathname) return false;
  // Consider both /chat/* paths and home page as chat pages
  return pathname.startsWith('/chat') || pathname === '/';
}

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
          <SidebarProvider defaultWidth={280} defaultOpen={false}>
            <div className={cn(
              "min-h-screen",
              isAuth ? "flex-center-col" : "flex-row"
            )}>
              {!isAuth && !isChat && <NavBar />}
              <main className={cn(
                "flex-1",
                !isAuth && !isChat && "pl-4",
                isAuth && "flex-center"
              )}>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </main>
            </div>
            <Toaster
              position="top-center"
              toastOptions={{
                className: 'border rounded-lg shadow-md',
                classNames: {
                  toast: 'group',
                  title: 'group-[.toast]:text-foreground',
                  description: 'group-[.toast]:text-muted-foreground',
                },
              }}
            />
          </SidebarProvider>
        </ThemeProvider>
      </Providers>
    </ErrorBoundary>
  );
} 