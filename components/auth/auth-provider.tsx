/**
 * Compatibility re-export for AuthProvider
 * This file re-exports the AuthProvider from its new location
 * to maintain backward compatibility with existing imports.
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'

// Define the User type
interface User {
  id: string;
  email: string;
  name?: string;
}

// Define the Session type
interface Session {
  user: User;
  expires: string;
}

// Define the AuthContextType
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to check if we're on an auth page
function isAuthPage(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.includes('/login') || 
         pathname.includes('/register') || 
         pathname.includes('/signup') || 
         pathname.includes('/forgot-password') ||
         pathname.includes('/reset-password');
}

// Helper to safely redirect to avoid loops
function safeRedirect(path: string, forceReload = false) {
  // Get the current location
  const currentPath = window.location.pathname;
  
  // Check if we're already on the target path to avoid unnecessary redirects
  if (currentPath === path) {
    console.log('Already on target path, skipping redirect');
    return;
  }
  
  // Implement a rate limit for redirects to prevent loops
  // With localStorage availability check
  try {
    const redirectKey = 'auth_redirect_timestamp';
    let shouldRedirect = true;
    
    // Only use localStorage if available
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const lastRedirect = localStorage.getItem(redirectKey);
        const now = Date.now();
        
        // Only allow redirects if we haven't redirected in the last 5 seconds
        shouldRedirect = !lastRedirect || (now - parseInt(lastRedirect)) > 5000;
        
        if (shouldRedirect) {
          localStorage.setItem(redirectKey, now.toString());
        } else {
          console.log('Redirect throttled to prevent loops');
        }
      } catch (e) {
        // localStorage might throw in private browsing or if quota is exceeded
        console.warn('localStorage error, proceeding with redirect:', e);
        shouldRedirect = true;
      }
    }
    
    // Proceed with redirect if allowed
    if (shouldRedirect) {
      // Use direct location change for more reliable cross-domain redirects
      if (forceReload) {
        window.location.href = path;
      } else {
        // For safer in-app redirects
        window.location.assign(path);
      }
    }
  } catch (e) {
    // Fallback if any error occurs in redirection
    console.error('Redirect error:', e);
    window.location.href = path;
  }
}

// Create the AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User'
  });
  const [session, setSession] = useState<Session | null>({
    user: {
      id: '1',
      email: 'demo@example.com',
      name: 'Demo User'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  // Track if we've already initialized
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Initial session check
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitialized) return
    
    // Check if API keys are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      setIsLoading(false)
      setHasInitialized(true)
      return
    }
    
    const setupUser = async () => {
      try {
        // Get auth state from Supabase
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Failed to get session:', error)
          setIsLoading(false)
          setHasInitialized(true)
          return
        }
        
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
          
          // Handle initial redirect if we're authenticated and on an auth page
          if (isAuthPage(pathname)) {
            safeRedirect('/', true);
          }
        }
      } catch (e) {
        console.error('Error during auth initialization:', e)
      } finally {
        setIsLoading(false)
        setHasInitialized(true)
      }
    }
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        // Update the state with the new session
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            // If we just signed in and are on an auth page, redirect to chat
            if (isAuthPage(pathname)) {
              safeRedirect('/', true);
            }
            break
            
          case 'SIGNED_OUT':
            // If we just signed out, redirect to login page if not already there
            if (!isAuthPage(pathname)) {
              safeRedirect('/login');
            }
            break
            
          // Handle token refresh silently
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
          case 'PASSWORD_RECOVERY':
            // No navigation needed
            break
            
          case 'INITIAL_SESSION':
            // Only redirect if authenticated and on a login/register page
            if (currentSession && isAuthPage(pathname)) {
              safeRedirect('/', true);
            }
            break
        }
      }
    )
    
    // Initial session check
    setupUser()
    
    // Clean up subscription on component unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [router, pathname, supabase, hasInitialized])
  
  // Mock sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockUser = {
        id: '1',
        email,
        name: 'Demo User'
      };
      
      setUser(mockUser);
      setSession({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      
      router.push('/');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mock sign out function
  const signOut = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(null);
      setSession(null);
      
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mock refresh session function
  const refreshSession = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (user) {
        setSession({
          user,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    } catch (error) {
      console.error('Refresh session error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Create the useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 