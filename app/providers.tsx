'use client';

import { AuthProvider } from '@/src/components/auth/auth-provider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster position="top-right" richColors />
    </>
  )
}

export default Providers; 

