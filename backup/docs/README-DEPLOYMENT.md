# Deployment Guide

This guide will help you successfully deploy this application by addressing common compatibility issues between Supabase, the Pages router, and the App router in Next.js.

## Step 1: Setup Database Tables

The first step is to create the required database tables in your Supabase project.

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to the "SQL Editor" tab
4. Create a new query
5. Paste the contents of `scripts/create-tables-and-policies.sql`
6. Run the script

This will create all the necessary tables, indexes, and RLS (Row Level Security) policies.

## Step 2: Configure Environment Variables

Ensure your `.env.local` file has all the required environment variables:

```
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database URL
DATABASE_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:5432/postgres
POSTGRES_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:5432/postgres

# Auth configuration
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Other service keys (if used)
OPENAI_API_KEY=your-openai-key
```

Make sure these are also configured in your Vercel project settings under the "Environment Variables" section.

## Step 3: Run the Compatibility Scripts

Before deploying, run these scripts to ensure compatibility between different Next.js routing systems:

```bash
# First, ensure router compatibility
node scripts/ensure-router-compatibility.js

# Then, run the test build script
node scripts/test-build.js
```

The compatibility script creates necessary adapters and wrapper components to handle differences between the App router and Pages router.

## Step 4: Test Locally

Before deploying, test the application locally:

```bash
npm run dev
```

Make sure to test the following:
- Authentication flow
- Todo creation and management
- Chat functionality
- Any other features your app implements

## Step 5: Deploy to Vercel

When you're ready to deploy:

1. Commit your changes
2. Push to your repository
3. Connect your repository to Vercel if not already done
4. Deploy the project

If you encounter any build errors, check the error logs and refer to the `NEXTJS_ROUTER_COMPATIBILITY.md` document for troubleshooting steps.

## Common Issues & Solutions

### 1. "next/headers" Error

If you see an error about importing "next/headers" in Pages:

- Make sure you're using the Pages-compatible components from `@/components/pages-safe`
- Run `node scripts/ensure-router-compatibility.js` to set up compatibility layers

### 2. Supabase Connection Issues

If you encounter Supabase connection problems:

- Verify your environment variables are correctly set
- Check if your RLS policies are configured properly
- Try running the SQL script again to ensure tables exist
- Ensure your service role key has not expired

### 3. Type Errors

If you see TypeScript errors:

- Make sure you're importing types from consistent locations
- Check that `types/supabase.ts` exists and has the correct schema

## Need More Help?

If you continue to encounter issues:

1. Check the detailed compatibility guide: `NEXTJS_ROUTER_COMPATIBILITY.md`
2. Run the test build script for detailed diagnostics: `node scripts/test-build.js`
3. Review the Supabase setup documentation: `SUPABASE_SETUP.md` 