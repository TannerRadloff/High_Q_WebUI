'use client';

import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from 'sonner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster position="top-right" richColors />
    </>
  )
} 