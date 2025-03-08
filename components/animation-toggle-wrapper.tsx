'use client';

import { usePathname } from 'next/navigation';
import { AnimationToggle } from './animation-toggle';

export function AnimationToggleWrapper() {
  const pathname = usePathname();
  
  // Don't render the AnimationToggle on any auth-related pages
  // Using a more robust check for auth routes
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthPage = authRoutes.some(route => pathname.includes(route));
  
  // Additional check for route groups
  if (isAuthPage || pathname.startsWith('/(auth)')) {
    return null;
  }
  
  return <AnimationToggle />;
} 