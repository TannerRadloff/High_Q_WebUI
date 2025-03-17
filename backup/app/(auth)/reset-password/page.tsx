'use client';

import { ResetPasswordForm } from '@/src/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="flex-center h-dvh w-screen md:pt-0 pt-12 md:items-center items-start bg-background">
      <ResetPasswordForm />
    </div>
  )
}

// This tells Next.js to always render this page on the server
export const dynamic = 'force-dynamic'; 

