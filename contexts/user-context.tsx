'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

// Define types for our user
export type User = {
  id: string;
  email?: string;
  name?: string;
};

// Define the context type
type UserContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<void>;
};

// Create the context with a default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Provider component that wraps the app
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // For demo purposes, we're using a mock user
  // In a real app, you would use Supabase Auth
  useEffect(() => {
    // Simulate loading user data
    const loadUser = async () => {
      try {
        // For demo, just create a mock user
        setUser({
          id: 'demo-user-id',
          email: 'demo@example.com',
          name: 'Demo User',
        });
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Mock sign in function
  const signIn = async (email: string, password: string) => {
    try {
      // In a real app, you would call supabase.auth.signInWithPassword
      setUser({
        id: 'demo-user-id',
        email,
        name: 'Demo User',
      });
      return { success: true };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error };
    }
  };

  // Mock sign out function
  const signOut = async () => {
    try {
      // In a real app, you would call supabase.auth.signOut
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Provide the user context to children components
  return (
    <UserContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </UserContext.Provider>
  );
} 