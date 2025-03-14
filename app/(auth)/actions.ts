'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getSupabaseActionClient } from '@/lib/supabase/server';

import { 
  createUser, 
  getUser, 
  createPasswordResetToken, 
  getPasswordResetByToken, 
  markPasswordResetTokenAsUsed, 
  updateUserPassword, 
} from '@/lib/db/queries';
import { sendPasswordResetEmail } from '@/lib/email';

const authFormSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(5),
});

const resetPasswordFormSchema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    // Validate the form data
    const validatedData = authFormSchema.parse({
      email,
      password,
    });

    // Use Supabase directly for authentication - specifically the action client
    const supabase = await getSupabaseActionClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      console.error('Supabase login error:', error);
      return { status: 'failed' };
    }

    // Make sure cookies are properly set
    if (data.session) {
      // Log successful authentication
      console.log('User authenticated successfully, session created');
      if (data.session.expires_at) {
        console.log('Session expires at:', new Date(data.session.expires_at * 1000).toISOString());
      }
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    console.error('Login error:', error);
    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }

    // Create user in your database first
    await createUser(validatedData.email, validatedData.password);
    
    // Then sign up with Supabase using the action client
    const supabase = await getSupabaseActionClient();
    
    // Get the base URL from the environment or use a default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const { error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      }
    });

    if (error) {
      console.error('Supabase signup error:', error);
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    console.error('Registration error:', error);
    return { status: 'failed' };
  }
};

export interface ForgotPasswordActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'user_not_found';
}

export const forgotPassword = async (
  _: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> => {
  try {
    const email = formData.get('email') as string;
    if (!email || !z.string().email().safeParse(email).success) {
      return { status: 'invalid_data' };
    }

    // Use Supabase's built-in password reset with the action client
    const supabase = await getSupabaseActionClient();
    
    // Get the base URL from the environment or use a default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { status: 'failed' };
  }
};

export interface ResetPasswordActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'invalid_token' | 'expired_token';
}

export const resetPassword = async (
  _: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> => {
  try {
    const validatedData = resetPasswordFormSchema.parse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    // Use Supabase to update the password with the action client
    const supabase = await getSupabaseActionClient();
    
    const { error } = await supabase.auth.updateUser({
      password: validatedData.password
    });

    if (error) {
      console.error('Supabase password update error:', error);
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    console.error('Reset password error:', error);
    return { status: 'failed' };
  }
};


