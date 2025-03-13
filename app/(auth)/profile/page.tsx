'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { LogoutButton } from '@/components/auth/logout-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-4 p-8">
          <h3 className="text-xl font-semibold text-center dark:text-zinc-50">Loading...</h3>
          <p className="text-sm text-gray-500 text-center dark:text-zinc-400">
            Please wait while we load your profile.
          </p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    router.push('/login')
    return null
  }

  // Get username from metadata or fall back to email
  const username = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  
  // Get initials for avatar fallback
  const initials = username.substring(0, 2).toUpperCase()
  
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.user_metadata?.avatar_url || ''} alt={username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CardTitle>{username}</CardTitle>
              <Button 
                size="sm" 
                variant="ghost" 
                className="flex items-center gap-1"
                onClick={() => router.push('/profile/edit')}
              >
                <span aria-hidden="true" className="text-sm">✏️</span>
                <span className="sr-only md:not-sr-only md:inline-block">Edit</span>
              </Button>
            </div>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Account Details</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Username: {username}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Email: {user.email}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Provider: {user.app_metadata?.provider || 'Email'}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Last Sign In: {new Date(user.last_sign_in_at || '').toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Email Verification</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Status: {user.email_confirmed_at ? 'Verified' : 'Not Verified'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push('/reset-password')}
          >
            Change Password
          </Button>
          <LogoutButton variant="destructive" className="w-full" />
        </CardFooter>
      </Card>
    </div>
  )
} 

