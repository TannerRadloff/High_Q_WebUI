'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const supabase = createClient()

  // Log Supabase env variables availability for debugging
  useEffect(() => {
    console.log('Auth Provider initialized')
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase Key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }, [])

  useEffect(() => {
    const setupUser = async () => {
      setIsLoading(true)
      
      try {
        console.log('Getting current session...')
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          return
        }
        
        console.log('Session retrieved:', !!currentSession)
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        // Set up auth state listener
        console.log('Setting up auth state change listener...')
        try {
          const { data: { subscription } } = await supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, updatedSession: Session | null) => {
              console.log('Auth state changed:', event)
              setSession(updatedSession)
              setUser(updatedSession?.user ?? null)
              router.refresh()
            }
          )
          
          return () => {
            console.log('Unsubscribing from auth changes')
            subscription.unsubscribe()
          }
        } catch (subscriptionError) {
          console.error('Error setting up auth subscription:', subscriptionError)
        }
      } catch (error) {
        console.error('Error setting up auth:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    setupUser()
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with email:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Sign in error:', error)
        toast.error(error.message || 'Failed to sign in')
        throw error
      }

      console.log('Sign in successful, session:', !!data.session)
      setUser(data.user)
      setSession(data.session)
      router.refresh()
      router.push('/')
    } catch (error: any) {
      console.error('Sign in exception:', error)
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        toast.error(error.message || 'Failed to sign out')
        return
      }
      
      console.log('Sign out successful')
      setUser(null)
      setSession(null)
      router.refresh()
      router.push('/login')
    } catch (error: any) {
      console.error('Sign out exception:', error)
      toast.error(error.message || 'Failed to sign out')
    }
  }

  const refreshSession = async () => {
    try {
      console.log('Refreshing session...')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        throw error
      }
      
      console.log('Session refreshed:', !!data.session)
      setSession(data.session)
      setUser(data.session?.user ?? null)
      router.refresh()
    } catch (error: any) {
      console.error('Error refreshing session:', error)
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
        isLoading,
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