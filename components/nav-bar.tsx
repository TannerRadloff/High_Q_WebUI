'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { LogoutButton } from '@/components/auth/logout-button'
import { UserAuthStatus } from '@/components/user-auth-status'
import { BotIcon, HomeIcon } from './icons'

const routes = [
  {
    href: '/',
    label: 'Home',
    protected: false,
  },
  {
    href: '/profile',
    label: 'Profile',
    protected: true,
  },
]

export function NavBar() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">NextJS AI Chatbot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {routes.map((route) => 
              (!route.protected || (route.protected && user)) && (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`transition-colors hover:text-foreground/80 ${pathname === route.href ? 'text-foreground font-medium' : 'text-foreground/60'}`}
                >
                  {route.label}
                </Link>
              )
            )}
          </nav>
          <div className="ml-4 flex items-center space-x-2">
            <Link
              href="/"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                isActive('/') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <HomeIcon size={16} />
              <span>Home</span>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <Button variant="outline">Profile</Button>
                </Link>
                <LogoutButton variant="destructive">Sign out</LogoutButton>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )
          )}
        </div>
      </div>
      <UserAuthStatus />
    </header>
  )
} 