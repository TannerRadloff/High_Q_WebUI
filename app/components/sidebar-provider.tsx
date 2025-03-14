import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/formatting';
import { SidebarContext, useIsMobile } from '../contexts/sidebar-context';

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultWidth?: number;
  defaultOpen?: boolean;
}

// Cookie name for persisting sidebar state
const SIDEBAR_COOKIE_NAME = 'sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export function SidebarProvider({
  children,
  defaultWidth = 320,
  defaultOpen = true
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [width, setWidth] = useState(defaultWidth);
  const [openMobile, setOpenMobile] = useState(false);
  
  // Get the state based on isOpen
  const state = isOpen ? 'expanded' : 'collapsed';
  
  // Toggle sidebar based on device type
  const toggleSidebar = () => {
    if (isMobile) {
      setOpenMobile(!openMobile);
    } else {
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      
      // Persist state in cookie
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${newIsOpen ? 'expanded' : 'collapsed'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  };
  
  // Load sidebar state from cookie on mount
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const cookies = document.cookie.split(';');
    const sidebarCookie = cookies.find(c => c.trim().startsWith(`${SIDEBAR_COOKIE_NAME}=`));
    
    if (sidebarCookie) {
      const state = sidebarCookie.split('=')[1].trim();
      setIsOpen(state === 'expanded');
    }
  }, []);

  return (
    <SidebarContext.Provider value={{ 
      isOpen, 
      setIsOpen, 
      width, 
      setWidth,
      openMobile,
      setOpenMobile,
      state,
      toggleSidebar,
      isMobile
    }}>
      <div className="flex h-screen">
        <aside 
          className={cn(
            "fixed left-0 top-0 z-40 h-screen transition-transform bg-sidebar",
            !isOpen && "-translate-x-full"
          )}
          style={{ width: `${width}px` }}
        >
          {/* Sidebar content container */}
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </aside>
        <div 
          className="flex-1 transition-all duration-300"
          style={{ marginLeft: isOpen && !isMobile ? `${width}px` : '0' }}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
} 