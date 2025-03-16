'use client';

import type { User } from '@supabase/supabase-js';
// @ts-ignore - Next.js type declarations issue
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import { PlusIcon, BoxIcon, InfoIcon, MenuIcon, RouteIcon } from '@/src/components/common/icons';
import { SidebarHistory } from '@/src/components/layout/sidebar-history';
import { SidebarUserNav } from '@/src/components/layout/sidebar-user-nav';
import { Button } from '@/src/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/src/components/ui/sidebar';
// @ts-ignore - Next.js type declarations issue
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { openMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Handle logo clicks for easter egg
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    
    if (newCount >= 5) {
      setShowEasterEgg(true);
      // Reset after 3 seconds
      setTimeout(() => {
        setShowEasterEgg(false);
        setLogoClickCount(0);
      }, 3000);
    }
  };

  // Force history refresh on network errors
  useEffect(() => {
    const errorOverlay = document.getElementById('error-recovery-overlay');
    
    // Function to check and handle chat history errors
    const checkChatHistoryErrors = () => {
      const historyErrorElements = document.querySelectorAll('.error-loading-history');
      if (historyErrorElements.length > 0) {
        // Try to refresh history data
        if (!isRetrying) {
          setIsRetrying(true);
          console.log('Attempting to refresh chat history data...');
          
          // Call an immediate refresh and then set up periodic retries
          router.refresh();
          
          // Reset retry flag after 5 seconds
          setTimeout(() => {
            setIsRetrying(false);
          }, 5000);
        }
      }
    };
    
    // Check for errors after component mounts
    const timer = setTimeout(checkChatHistoryErrors, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [router, isRetrying]);

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 bg-sidebar/95 backdrop-blur-sm">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex-between">
            <Link
              href="/"
              onClick={(e) => {
                setOpenMobile(false);
                handleLogoClick();
              }}
              className="flex-row-center gap-3"
            >
              <AnimatePresence>
                {showEasterEgg ? (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="text-lg font-semibold px-2 text-primary-foreground bg-primary rounded-md cursor-pointer transition-all duration-300 ease-in-out">
                    Super HighQ!
                  </motion.span>
                ) : (
                  <motion.span 
                    className="text-lg font-semibold px-2 hover:bg-primary/10 hover:text-primary rounded-md cursor-pointer transition-all duration-300 ease-in-out"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}>
                    HighQ - Beta
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <div className="flex-row-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-center"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push('/');
                      router.refresh();
                    }}
                  >
                    <PlusIcon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">New Chat</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-center md:hidden"
                    onClick={() => setOpenMobile(!openMobile)}
                  >
                    <MenuIcon size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">Toggle Menu</TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Quick access buttons */}
          <div className="flex-row-center gap-1 mt-4 mb-2 px-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 justify-start text-xs px-2"
              onClick={() => {
                setOpenMobile(false);
                router.push('/');
              }}
            >
              <span className="truncate">New Chat</span>
            </Button>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    router.push('/agent-builder');
                    setOpenMobile(false);
                  }}
                >
                  <RouteIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Agent Builder</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    router.refresh();
                  }}
                >
                  <InfoIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">About HighQ</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="relative overflow-hidden">
          <SidebarHistory user={user} />
          
          {/* Loading indicator overlay for history */}
          {isRetrying && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex-center">
              <div className="flex-col-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                <span className="text-xs">Refreshing chats...</span>
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-2">
          <div className="text-xs text-muted-foreground mb-2 px-2">Powered by OpenAI Agents</div>
        </div>
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
