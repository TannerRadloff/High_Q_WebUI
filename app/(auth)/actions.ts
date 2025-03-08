'use server';

import { z } from 'zod';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { randomBytes } from 'crypto';

import { 
  createUser, 
  getUser, 
  createPasswordResetToken, 
  getPasswordResetByToken, 
  markPasswordResetTokenAsUsed, 
  updateUserPassword, 
  getUserById 
} from '@/lib/db/queries';
import { sendPasswordResetEmail } from '@/lib/email';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
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
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

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
    await createUser(validatedData.email, validatedData.password);
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

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

    const users = await getUser(email);
    if (users.length === 0) {
      return { status: 'user_not_found' };
    }

    const user = users[0];
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    await createPasswordResetToken(user.id, token, expiresAt);

    // Get the base URL from the environment or use a default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await sendPasswordResetEmail(email, token, baseUrl);

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
    const token = formData.get('token') as string;
    if (!token) {
      return { status: 'invalid_token' };
    }

    const resetToken = await getPasswordResetByToken(token);
    if (!resetToken) {
      return { status: 'invalid_token' };
    }

    if (resetToken.used) {
      return { status: 'invalid_token' };
    }

    if (resetToken.expiresAt < new Date()) {
      return { status: 'expired_token' };
    }

    const validatedData = resetPasswordFormSchema.parse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const salt = genSaltSync(10);
    const hash = hashSync(validatedData.password, salt);

    await updateUserPassword(resetToken.userId, hash);
    await markPasswordResetTokenAsUsed(resetToken.id);

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    console.error('Reset password error:', error);
    return { status: 'failed' };
  }
};
