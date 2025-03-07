'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Form from 'next/form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/submit-button';

import { resetPassword, type ResetPasswordActionState } from '../actions';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<ResetPasswordActionState, FormData>(
    resetPassword,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [token, router]);

  useEffect(() => {
    if (state.status === 'failed') {
      toast.error('Failed to reset password. Please try again.');
    } else if (state.status === 'invalid_data') {
      toast.error('Please check your password inputs.');
    } else if (state.status === 'invalid_token') {
      toast.error('Invalid or expired reset token.');
      setTimeout(() => {
        router.push('/forgot-password');
      }, 2000);
    } else if (state.status === 'expired_token') {
      toast.error('Your reset link has expired. Please request a new one.');
      setTimeout(() => {
        router.push('/forgot-password');
      }, 2000);
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      toast.success('Password reset successful!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    if (token) {
      formData.append('token', token);
    }
    formAction(formData);
  };

  if (!token) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-background">
        <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-4 p-8">
          <h3 className="text-xl font-semibold text-center dark:text-zinc-50">Invalid Reset Link</h3>
          <p className="text-sm text-gray-500 text-center dark:text-zinc-400">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Reset Password</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Enter your new password below
          </p>
        </div>
        <Form action={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="password"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              New Password
            </Label>

            <Input
              id="password"
              name="password"
              className="bg-muted text-md md:text-sm"
              type="password"
              required
              autoFocus
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="confirmPassword"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              Confirm New Password
            </Label>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              className="bg-muted text-md md:text-sm"
              type="password"
              required
              minLength={6}
            />
          </div>

          <SubmitButton isSuccessful={isSuccessful}>Reset Password</SubmitButton>
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