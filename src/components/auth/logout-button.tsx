'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/src/components/ui/button'
import { useAuth } from '@/src/components/auth/auth-provider'

interface LogoutButtonProps {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function LogoutButton({ children, className, variant = 'default' }: LogoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { signOut } = useAuth()

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      await signOut()
      // The signOut method in AuthProvider already handles navigation and toast messages
    } catch (error) {
      // Error handling is done in the AuthProvider
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant={variant} 
      className={className} 
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out...' : children || 'Sign out'}
    </Button>
  )
} 