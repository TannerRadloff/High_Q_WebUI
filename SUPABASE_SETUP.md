# Supabase Authentication Setup Guide

This guide will help you set up Supabase Authentication for your Next.js AI Chatbot project.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up for an account if you don't have one
2. Create a new project
3. Note your project URL and anon key (found in the project settings under API)

## 2. Configure Environment Variables

Add the following to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Set Up Authentication Settings in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Settings
3. Configure the following settings:

### Site URL
- Set your site URL (e.g., `https://yourdomain.com` or `http://localhost:3000` for development)

### Redirect URLs
- Add authorized redirect URLs:
  - `https://yourdomain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for development)

### Email Auth
- Enable Email Auth
- Configure the email template for password recovery
- Set "Confirm email" according to your preference

### OAuth Providers (Optional)
- Set up OAuth providers like Google
- Add the client ID and secret
- Make sure redirect URLs are properly configured

## 4. Email Configuration (Optional)

If you want to send emails (for password resets, etc.):

1. Go to Authentication → Email Templates
2. Customize the templates for:
   - Confirmation
   - Invite
   - Magic Link
   - Reset Password

## 5. Testing Your Authentication

1. Start your Next.js development server
2. Try registering a new user
3. Test login functionality
4. Test OAuth login (if configured)
5. Test password reset flow

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js and Supabase Integration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) 