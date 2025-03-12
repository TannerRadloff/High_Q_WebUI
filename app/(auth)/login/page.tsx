'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Form from 'next/form';
import { signIn as nextAuthSignIn } from 'next-auth/react';

import { AuthForm } from '../../../components/auth-form';
import { SubmitButton } from '../../../components/submit-button';
import { Button } from '../../../components/ui/button';
import { LogoGoogle } from '../../../components/icons';

import { login, type LoginActionState } from '../actions';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    if (state.status === 'failed') {
      toast.error('Invalid credentials!');
    } else if (state.status === 'invalid_data') {
      toast.error('Failed validating your submission!');
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      router.refresh();
      router.push('/');
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  const handleGoogleSignIn = async () => {
    try {
      await nextAuthSignIn('google', { callbackUrl: '/' });
    } catch (error) {
      toast.error('Failed to sign in with Google');
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-8">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Welcome back</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
          <div className="flex flex-col gap-2 text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            <Link
              href="/forgot-password"
              className="text-gray-500 hover:underline dark:text-zinc-500"
            >
              Forgot your password?
            </Link>
            <div className="text-gray-600 dark:text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign up
              </Link>
            </div>
          </div>
        </AuthForm>

        <div className="px-4 sm:px-16">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-gray-500 dark:text-zinc-400">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-6 w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
          >
            <LogoGoogle />
            <span>Sign in with Google</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
