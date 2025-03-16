'use client';

import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster 
        position="top-center" 
        richColors
        toastOptions={{
          className: 'border rounded-lg shadow-md',
          classNames: {
            toast: 'group',
            title: 'group-[.toast]:text-foreground',
            description: 'group-[.toast]:text-muted-foreground',
          },
          duration: 5000,
        }}
      />
    </>
  )
}

export default Providers; 

