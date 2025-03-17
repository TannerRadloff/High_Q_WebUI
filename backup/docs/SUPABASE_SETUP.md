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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can run `node scripts/update-env-for-supabase.js` to check if all required environment variables are present and add any missing ones with instructions.

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

## 5. Set Up Row Level Security (RLS) Policies

Supabase uses PostgreSQL's Row Level Security (RLS) to control access to data. By default, when RLS is enabled, no data is accessible to users without proper policies.

1. Make sure your `.env.local` file has the `SUPABASE_SERVICE_ROLE_KEY` variable set
2. Run our RLS setup script:
   ```bash
   node scripts/setup-rls-policies.js
   ```
3. Verify the configuration was successful:
   ```bash
   node scripts/verify-supabase-config.js
   ```

### Understanding the RLS Policies

The RLS policies set up by the script implement the following security rules:

- **Chat Table**:
  - Users can only view, edit, and delete their own chats
  - Public chats can be viewed by anyone

- **Message Table**:
  - Users can only view messages in their own chats or public chats
  - Users can only add messages to their own chats
  - Users can only delete messages in their own chats

- **Vote Table**:
  - Users can only view votes on their own chats or public chats
  - Users can only add, update, or delete votes on their own chats

- **Document Table**:
  - Users can only manage documents they own

### Manual RLS Setup (If Needed)

If you need to manually set up RLS policies, go to your Supabase dashboard:

1. Navigate to the "Authentication" tab
2. Select "Policies" from the sidebar
3. For each table (chat, message, vote, document):
   - Enable Row Level Security
   - Add appropriate policies for SELECT, INSERT, UPDATE, and DELETE operations
   - Use the auth.uid() function to restrict access to the user's own data

## 6. Testing Your Authentication

1. Start your Next.js development server
2. Try registering a new user
3. Test login functionality
4. Test OAuth login (if configured)
5. Test password reset flow
6. Verify that users can only access their own data

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js and Supabase Integration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) 