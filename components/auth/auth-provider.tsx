'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasEnvError, setHasEnvError] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  // Track if we've already redirected to prevent loops
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    console.log('[AuthProvider] Initializing', { pathname })
    
    // Check for environment configuration issues through API instead of directly
    fetch('/api/check-env')
      .then(response => response.json())
      .then(data => {
        if (!data.isValid) {
          console.error('[AuthProvider] Environment configuration issues detected');
          setHasEnvError(true);
          setIsLoading(false);
          return;
        }
        // Continue with setupUser if env check passes
        setupUser();
      })
      .catch(error => {
        console.error('[AuthProvider] Error checking environment:', error);
        // Continue with setupUser even if env check fails
        setupUser();
      });
    
    const setupUser = async () => {
      setIsLoading(true)
      
      try {
        console.log('[AuthProvider] Getting current session...')
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthProvider] Error getting session:', sessionError)
          return
        }
        
        console.log('[AuthProvider] Session retrieved:', { 
          hasSession: !!currentSession,
          user: currentSession?.user?.email
        })
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Set up auth state listener
        console.log('[AuthProvider] Setting up auth state change listener...')
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, updatedSession: Session | null) => {
            console.log('[AuthProvider] Auth state changed:', { 
              event, 
              hasSession: !!updatedSession,
              user: updatedSession?.user?.email,
              pathname
            })
            
            setSession(updatedSession)
            setUser(updatedSession?.user ?? null)
            
            // Don't redirect again if we've already redirected once during this session
            if (hasRedirected) {
              console.log('[AuthProvider] Already redirected once, skipping redirect')
              router.refresh()
              return
            }
            
            // Handle specific auth events
            switch (event) {
              case 'SIGNED_IN':
                // Only redirect if not already on home page
                if (pathname !== '/') {
                  console.log('[AuthProvider] Redirecting to home after sign in')
                  setHasRedirected(true)
                  router.push('/')
                } else {
                  console.log('[AuthProvider] Already on home page, no redirect needed')
                  router.refresh()
                }
                break
              case 'SIGNED_OUT':
                // Only redirect if not already on login page
                if (pathname !== '/login') {
                  console.log('[AuthProvider] Redirecting to login after sign out')
                  setHasRedirected(true)
                  router.push('/login')
                } else {
                  console.log('[AuthProvider] Already on login page, no redirect needed')
                  router.refresh()
                }
                break
              default:
                router.refresh()
            }
          }
        )
        
        return () => {
          console.log('[AuthProvider] Cleaning up auth subscription')
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('[AuthProvider] Error setting up auth:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }, [pathname, router, supabase, hasRedirected])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthProvider] Attempting sign in:', { email })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('[AuthProvider] Sign in error:', error)
        toast.error(error.message || 'Failed to sign in')
        throw error
      }

      console.log('[AuthProvider] Sign in successful:', {
        hasSession: !!data.session,
        user: data.user?.email
      })
      
      // Manual redirect instead of waiting for onAuthStateChange
      if (pathname !== '/') {
        router.push('/')
      } else {
        router.refresh()
      }
    } catch (error: any) {
      console.error('[AuthProvider] Sign in exception:', error)
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[AuthProvider] Sign out error:', error)
        toast.error(error.message || 'Failed to sign out')
        return
      }
      
      // Manual redirect instead of waiting for onAuthStateChange
      setSession(null)
      setUser(null)
      
      if (pathname !== '/login') {
        router.push('/login')
      } else {
        router.refresh()
      }
    } catch (error: any) {
      console.error('[AuthProvider] Sign out exception:', error)
      toast.error(error.message || 'Failed to sign out')
    }
  }

  const refreshSession = async () => {
    try {
      console.log('[AuthProvider] Refreshing session...')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthProvider] Session refresh error:', error)
        throw error
      }
      
      console.log('[AuthProvider] Session refreshed:', {
        hasSession: !!data.session,
        user: data.session?.user?.email
      })
      
      setSession(data.session)
      setUser(data.session?.user ?? null)
      router.refresh()
    } catch (error: any) {
      console.error('[AuthProvider] Error refreshing session:', error)
      if (error.message?.includes('expired')) {
        toast.error('Your session has expired. Please sign in again.')
        await signOut()
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading: isLoading || hasEnvError, // Treat env errors as still loading
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
} 