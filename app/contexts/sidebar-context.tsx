import { createContext, useContext } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  width: number;
  setWidth: (width: number) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  setIsOpen: () => {},
  width: 320,
  setWidth: () => {}
});

export const useSidebar = () => useContext(SidebarContext); 