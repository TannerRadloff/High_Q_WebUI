import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { getUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        // Check for hardcoded admin credentials
        if (email === 'admin' && password === 'admin') {
          return {
            id: 'admin-user',
            email: 'admin',
            name: 'Administrator'
          };
        }
        
        // For regular users, try to get the user from the database
        // The email field might contain either an email or a username
        try {
          const users = await getUser(email);
          if (users.length === 0) return null;
          // biome-ignore lint: Forbidden non-null assertion.
          const passwordsMatch = await compare(password, users[0].password!);
          if (!passwordsMatch) return null;
          return users[0] as any;
        } catch (error) {
          console.error('Error authenticating user:', error);
          // If database connection fails, still allow admin login
          if (email === 'admin' && password === 'admin') {
            return {
              id: 'admin-user',
              email: 'admin',
              name: 'Administrator'
            };
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
