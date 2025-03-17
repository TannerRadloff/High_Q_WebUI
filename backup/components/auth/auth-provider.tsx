/**
 * Compatibility re-export for AuthProvider
 * This file re-exports the AuthProvider from its new location
 * to maintain backward compatibility with existing imports.
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { AuthChangeEvent } from '@supabase/supabase-js'

// Define our custom User type
interface AppUser {
  id: string;
  email: string;
  name?: string;
}

// Define our custom Session type
interface AppSession {
  user: AppUser;
  expires: string;
}

// Define the AuthContextType
interface AuthContextType {
  user: AppUser | null;
  session: AppSession | null;
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

// Helper to check if running in browser environment
const isBrowser = typeof window !== 'undefined';

// Helper to safely redirect to avoid loops
function safeRedirect(path: string, forceReload = false) {
  // Only run redirects in browser environment
  if (!isBrowser) return;
  
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
    if (typeof localStorage !== 'undefined') {
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
    if (isBrowser) {
      window.location.href = path;
    }
  }
}

// Helper function to convert Supabase session to our custom session type
function convertSession(supabaseSession: any): AppSession | null {
  if (!supabaseSession) return null;
  
  try {
    return {
      user: {
        id: supabaseSession.user.id,
        email: supabaseSession.user.email || '',
        name: supabaseSession.user.user_metadata?.name
      },
      expires: new Date(
        supabaseSession.expires_at 
          ? supabaseSession.expires_at * 1000 
          : Date.now() + 24 * 60 * 60 * 1000
      ).toISOString()
    };
  } catch (error) {
    console.error('Error converting session:', error);
    return null;
  }
}

// Create the AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Set initial state depending on whether we're in browser or server
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Only initialize Supabase client in browser environment
  const supabase = isBrowser ? createClient() : null;
  
  // Track if we've already initialized
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Set isClient on mount to confirm we're in browser environment
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Initial session check
  useEffect(() => {
    // Don't run this on the server
    if (!isBrowser || !supabase) {
      setIsLoading(false);
      return;
    }
    
    // Prevent duplicate initialization
    if (hasInitialized) return;
    
    // Check if API keys are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      setIsLoading(false);
      setHasInitialized(true);
      return;
    }
    
    const setupUser = async () => {
      try {
        // Get auth state from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Failed to get session:', error);
          setIsLoading(false);
          setHasInitialized(true);
          return;
        }
        
        if (data.session) {
          const appSession = convertSession(data.session);
          if (appSession) {
            setSession(appSession);
            setUser(appSession.user);
            
            // Handle initial redirect if we're authenticated and on an auth page
            if (isAuthPage(pathname)) {
              safeRedirect('/', true);
            }
          }
        }
      } catch (e) {
        console.error('Error during auth initialization:', e);
      } finally {
        setIsLoading(false);
        setHasInitialized(true);
      }
    };
    
    // Set up auth state listener - only in browser environment
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, currentSupabaseSession: any) => {
          // Convert the Supabase session to our app session
          const currentSession = convertSession(currentSupabaseSession);
          
          // Update the state with the new session
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // Handle different auth events
          switch (event) {
            case 'SIGNED_IN':
              // If we just signed in and are on an auth page, redirect to chat
              if (isAuthPage(pathname)) {
                safeRedirect('/', true);
              }
              break;
              
            case 'SIGNED_OUT':
              // If we just signed out, redirect to login page if not already there
              if (!isAuthPage(pathname)) {
                safeRedirect('/login');
              }
              break;
              
            // Handle token refresh silently
            case 'TOKEN_REFRESHED':
            case 'USER_UPDATED':
            case 'PASSWORD_RECOVERY':
              // No navigation needed
              break;
              
            case 'INITIAL_SESSION':
              // Only redirect if authenticated and on a login/register page
              if (currentSession && isAuthPage(pathname)) {
                safeRedirect('/', true);
              }
              break;
          }
        }
      );
      
      subscription = data.subscription;
    }
    
    // Initial session check
    setupUser();
    
    // Clean up subscription on component unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router, pathname, supabase, hasInitialized]);
  
  // Initialize with demo values in development mode or when Supabase is not configured
  useEffect(() => {
    if (isClient && isLoading && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('No Supabase config found, using demo mode');
      // Use demo data after a small delay
      const timer = setTimeout(() => {
        const demoUser: AppUser = {
          id: '1',
          email: 'demo@example.com',
          name: 'Demo User'
        };
        
        setUser(demoUser);
        setSession({
          user: demoUser,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
        setIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isClient, isLoading]);
  
  // Sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Check if we're in browser environment
      if (!isBrowser) {
        throw new Error('Cannot sign in outside of browser environment');
      }
      
      // Check if we have Supabase configured
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        if (data.session) {
          const appSession = convertSession(data.session);
          if (appSession) {
            setSession(appSession);
            setUser(appSession.user);
          }
        }
      } else {
        // Simulate API call for demo mode
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const demoUser: AppUser = {
          id: '1',
          email,
          name: 'Demo User'
        };
        
        setUser(demoUser);
        setSession({
          user: demoUser,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      router.push('/');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    // Skip if not in browser
    if (!isBrowser) return;
    
    setIsLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      // Always reset state regardless of API success
      setUser(null);
      setSession(null);
      
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh the session
  const refreshSession = async () => {
    // Skip if not in browser
    if (!isBrowser || !supabase) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        // If we can't refresh, sign the user out
        await signOut();
        return;
      }
      
      if (data.session) {
        const appSession = convertSession(data.session);
        if (appSession) {
          setSession(appSession);
          setUser(appSession.user);
        } else {
          // No valid session returned from refresh, sign out
          await signOut();
        }
      } else {
        // No session returned from refresh, sign out
        await signOut();
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize value to prevent unnecessary re-renders
  const contextValue: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signOut,
    refreshSession
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 