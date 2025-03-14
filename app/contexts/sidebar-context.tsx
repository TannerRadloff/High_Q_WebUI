import { createContext, useContext, useState, useEffect } from 'react';
import { useIsMobile } from '../../hooks/use-mobile';

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
  width: 280,
  setWidth: () => {},
  
  openMobile: false,
  setOpenMobile: () => {},
  state: 'expanded',
  toggleSidebar: () => {},
  isMobile: false
});

// Hook for easy context consumption
export const useSidebar = () => useContext(SidebarContext);

// Function to detect mobile viewport is now imported from @/hooks/use-mobile 