'use client';

import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

// Define the User type
interface User {
  id: string;
  email: string;
  name?: string;
}

// Define the Session type
interface Session {
  user: User;
  expires: string;
}

// Define the AuthContextType
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User'
  });
  const [session, setSession] = useState<Session | null>({
    user: {
      id: '1',
      email: 'demo@example.com',
      name: 'Demo User'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Mock sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockUser = {
        id: '1',
        email,
        name: 'Demo User'
      };
      
      setUser(mockUser);
      setSession({
        user: mockUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      
      router.push('/');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mock sign out function
  const signOut = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(null);
      setSession(null);
      
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mock refresh session function
  const refreshSession = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (user) {
        setSession({
          user,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    } catch (error) {
      console.error('Refresh session error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Create the useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 