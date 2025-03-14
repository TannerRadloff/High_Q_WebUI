'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/src/components/layout/app-sidebar';
import { SidebarInset, useSidebar } from '@/src/components/ui/sidebar';
import { useAuth } from '@/components/auth/auth-provider';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const { setOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // Ensure sidebar is open by default on home page
  useEffect(() => {
    if (isHomePage) {
      setOpen(true);
    }
    setMounted(true);
  }, [isHomePage, setOpen]);

  // Only render the sidebar layout if we're on the home page and the component has mounted
  if (!isHomePage || !mounted) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AppSidebar user={user || undefined} />
      <SidebarInset className="flex-1 overflow-auto">
        <div className="flex flex-col h-full">
          {children}
        </div>
      </SidebarInset>
    </div>
  );
} 