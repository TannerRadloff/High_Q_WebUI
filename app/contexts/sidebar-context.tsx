import { createContext, useContext, useState, useEffect } from 'react';

// Define sidebar state types
export type SidebarState = 'expanded' | 'collapsed';

// Define the context interface
interface SidebarContextType {
  // Core state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  width: number;
  setWidth: (width: number) => void;
  
  // Extended state for responsive behavior
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  state: SidebarState;
  toggleSidebar: () => void;
  isMobile: boolean;
}

// Create context with default values
export const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  setIsOpen: () => {},
  width: 320,
  setWidth: () => {},
  openMobile: false,
  setOpenMobile: () => {},
  state: 'expanded',
  toggleSidebar: () => {},
  isMobile: false
});

// Hook for easy context consumption
export const useSidebar = () => useContext(SidebarContext);

// Function to detect mobile viewport
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
} 