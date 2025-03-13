import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { SidebarContext } from '../contexts/sidebar-context';

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultWidth?: number;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultWidth = 320,
  defaultOpen = true
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [width, setWidth] = useState(defaultWidth);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, width, setWidth }}>
      <div className="flex h-screen">
        <aside 
          className={cn(
            "fixed left-0 top-0 z-40 h-screen transition-transform",
            !isOpen && "-translate-x-full"
          )}
          style={{ width: `${width}px` }}
        >
          {/* Sidebar content */}
          <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {children}
          </div>
        </aside>
        <div 
          className="flex-1 transition-all duration-300"
          style={{ marginLeft: isOpen ? `${width}px` : '0' }}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
} 