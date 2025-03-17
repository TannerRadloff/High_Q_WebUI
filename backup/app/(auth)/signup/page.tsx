'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterForm } from '@/src/components/auth/register-form'
import { motion } from 'framer-motion'
import type { User } from '@supabase/supabase-js'

export default function SignupPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // We'll check for user in useEffect to avoid SSG issues
  useEffect(() => {
    // Import auth dynamically to avoid SSG issues
    const loadAuth = async () => {
      try {
        const { useAuth } = await import('@/components/auth/auth-provider')
        const { user, isLoading } = useAuth()
        setUser(user)
        setIsLoading(isLoading)
      } catch (error) {
        console.error('Failed to load auth provider:', error)
        setIsLoading(false)
      }
    }
    
    loadAuth()
  }, [])

  useEffect(() => {
    if (!isLoading && user) {
      setIsRedirecting(true)
      // Add a small delay for a smoother transition
      const redirectTimeout = setTimeout(() => {
        router.push('/')
      }, 300)

      return () => clearTimeout(redirectTimeout)
    }
  }, [user, isLoading, router])

  return (
    <div className="flex-center-col min-h-screen py-2 bg-gradient-to-b from-black via-slate-900 to-slate-950">
      {/* Loading state */}
      {isLoading && (
        <motion.div 
          key="loading"
          className="w-full max-w-md flex-center-col space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      )}
      
      {/* Redirect indicator */}
      {isRedirecting && (
        <motion.div 
          className="modal-overlay visible" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-background p-4 rounded-md shadow-xl">
            <div className="flex-row-center space-x-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p>Redirecting to dashboard...</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Signup form for non-authenticated users */}
      {!isLoading && !isRedirecting && !user && (
        <RegisterForm />
      )}
    </div>
  )
} 