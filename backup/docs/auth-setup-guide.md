# Supabase Auth Setup Guide

This guide will help you set up Supabase authentication in your project.

## Environment Variables

1. Copy the `.env.example` file to `.env.local`
2. Fill in your Supabase URL and anon key from your Supabase project dashboard

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Setting up Email/Password Authentication

1. In your Supabase dashboard, go to Authentication > Email
2. Enable Email provider

## Setting up Google OAuth

1. In your Supabase dashboard, go to Authentication > OAuth Providers
2. Enable Google provider 
3. Create OAuth credentials in the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (if you don't have one)
   - Configure OAuth consent screen (External is fine for development)
   - Create OAuth client ID credentials (Web application type)
   - Add your domain to Authorized JavaScript origins (e.g., http://localhost:3000)
   - Add authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
4. Copy the Client ID and Client Secret to Supabase's Google provider settings
5. Save your changes

## Username Support

The application supports usernames for all authentication methods:

1. **Email/Password Registration**:
   - Users provide a username during registration
   - Username is stored in user metadata

2. **Google OAuth**:
   - Users can update their username after signing in with Google
   - By default, the name from Google is used

3. **Profile Management**:
   - Users can edit their username on the profile edit page

## Testing Authentication

1. Run your application locally:
```
npm run dev
```

2. Test the registration flow:
   - Go to `/register`
   - Create an account with email/password or use Google OAuth

3. Test the login flow:
   - Go to `/login` 
   - Log in with your credentials or Google

4. Test the logout flow:
   - Use the logout button in the navigation bar

5. Test password reset:
   - Go to `/forgot-password`
   - Enter your email and follow the reset link in your email

## Protecting Routes

Routes protection is handled by the middleware. Only authenticated users can access protected routes like:
- `/profile`
- `/settings` 
- Any other routes you want to protect

## Customizing the Auth UI

The authentication components are located in:
- `components/auth/login-form.tsx`
- `components/auth/register-form.tsx`
- `components/auth/forgot-password-form.tsx`
- `components/auth/reset-password-form.tsx`

You can customize these components to match your application's design and requirements. 