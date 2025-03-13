# Creating a Demo User in Supabase

This document outlines different methods to create a demo user account in your Supabase project.

## Method 1: Using the JavaScript Script (Recommended)

1. First, get your Supabase service role key from your Supabase dashboard:
   - Go to your Supabase project dashboard
   - Click on "Project Settings" in the sidebar
   - Navigate to "API" tab
   - Copy the "service_role key" (NOT the anon key)

2. Add the service role key to your `.env.local` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. Run the script to create the demo user:
   ```bash
   node scripts/create-demo-user.js
   ```

## Method 2: Using the Supabase CLI

If you prefer using the Supabase CLI:

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Create the demo user using the CLI:
   ```bash
   supabase projects functions invoke auth-admin-create-user --project-ref YOUR_PROJECT_REF -b '{"email":"demo@example.com","password":"demo1","user_metadata":{"username":"demo","full_name":"Demo User"},"email_confirm":true}'
   ```

   Replace `YOUR_PROJECT_REF` with your Supabase project reference (found in the URL of your Supabase dashboard).

## Method 3: Using the Supabase Dashboard

You can also create the user directly through the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Users"
3. Click "Add User"
4. Enter the email `demo@example.com` and password `demo1`
5. After creating, click on the user to edit and add user metadata:
   ```json
   {
     "username": "demo",
     "full_name": "Demo User"
   }
   ```

## Testing the Demo User

Once created, you can test the demo user by logging in with:
- Email: `demo@example.com` (or if you want to use username login, use `demo`)
- Password: `demo1` 