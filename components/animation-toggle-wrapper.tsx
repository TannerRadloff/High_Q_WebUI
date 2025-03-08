'use client';

import { usePathname } from 'next/navigation';
import { AnimationToggle } from './animation-toggle';

export function AnimationToggleWrapper() {
  const pathname = usePathname();
  
  // Don't render the AnimationToggle on any auth-related pages
  const isAuthPage = pathname.includes('/login') || 
                     pathname.includes('/register') || 
                     pathname.includes('/forgot-password') ||
                     pathname.includes('/reset-password');
  
  if (isAuthPage) {
    return null;
  }
  
  return <AnimationToggle />;
} 