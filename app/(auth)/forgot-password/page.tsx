'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Form from 'next/form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/submit-button';

import { forgotPassword, type ForgotPasswordActionState } from '../actions';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<ForgotPasswordActionState, FormData>(
    forgotPassword,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    if (state.status === 'failed') {
      toast.error('Failed to send reset link. Please try again.');
    } else if (state.status === 'invalid_data') {
      toast.error('Please enter a valid email address.');
    } else if (state.status === 'user_not_found') {
      toast.error('No account found with that email address.');
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      toast.success('Password reset link sent! Please check your email.');
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Forgot Password</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        <Form action={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="email"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              Email Address
            </Label>

            <Input
              id="email"
              name="email"
              className="bg-muted text-md md:text-sm"
              type="email"
              placeholder="user@acme.com"
              autoComplete="email"
              required
              autoFocus
              defaultValue={email}
            />
          </div>

          <SubmitButton isSuccessful={isSuccessful}>Send Reset Link</SubmitButton>
          <div className="flex flex-col gap-2 text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Back to Login
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
} 