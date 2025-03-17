'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const { success, error } = await signUpWithEmail(email, password);
      if (success) {
        setSuccessMessage('Please check your email to confirm your account');
        // User will be directed to login after email confirmation
      } else {
        setError(error?.message || 'Failed to sign up');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    
    try {
      await signInWithGoogle();
      // No need to redirect, OAuth flow will handle it
    } catch (err) {
      setError('Failed to sign up with Google');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              Enter your email to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              type="button" 
              className="w-full" 
              onClick={handleGoogleSignup}
            >
              <svg
                className="mr-2 h-5 w-5"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M23.7666 12.2273C23.7666 11.3909 23.6909 10.8 23.5273 10.1818H12.2182V14.4773H18.9C18.7727 15.5455 18.0818 17.1136 16.5955 18.1818L16.5766 18.3102L20.2045 21.0682L20.4545 21.0909C22.725 19.0455 23.7666 15.9318 23.7666 12.2273Z"
                  fill="#4285F4"
                />
                <path
                  d="M12.2182 23.75C15.45 23.75 18.1682 22.7727 20.4546 21.0909L16.5955 18.1818C15.5773 18.8636 14.1682 19.3182 12.2182 19.3182C9.06365 19.3182 6.41819 17.2727 5.46365 14.4773L5.34092 14.4879L1.55456 17.3523L1.50001 17.4659C3.77274 21.2045 7.7182 23.75 12.2182 23.75Z"
                  fill="#34A853"
                />
                <path
                  d="M5.46365 14.4773C5.2182 13.8591 5.07274 13.1818 5.07274 12.5C5.07274 11.8182 5.2182 11.1409 5.44547 10.5227L5.4398 10.3868L1.5971 7.48865L1.50001 7.53409C0.690928 9.05682 0.218201 10.7273 0.218201 12.5C0.218201 14.2727 0.690928 15.9432 1.50001 17.4659L5.46365 14.4773Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.2182 5.68181C14.4546 5.68181 15.9909 6.68181 16.8546 7.47726L20.3455 4.10454C18.1591 2.09999 15.45 0.75 12.2182 0.75C7.7182 0.75 3.77274 3.29545 1.50001 7.53408L5.44547 10.5227C6.41819 7.72726 9.06365 5.68181 12.2182 5.68181Z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </CardContent>
          <CardFooter>
            <div className="text-center w-full text-sm">
              Already have an account?{' '}
              <Link 
                href="/auth/login"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 