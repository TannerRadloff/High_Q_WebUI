# Next.js Router Compatibility Guidelines

## The Problem

This project encountered a build error when trying to deploy to Vercel:

```
Error: You're importing a component that needs "next/headers". That only works in a Server Component which is not supported in the pages/ directory.
```

This error happens because our project uses both:

1. **App Router** (newer Next.js 13+ feature for server components)
2. **Pages Router** (traditional Next.js pages)

In this hybrid approach, we need to be careful about component imports between the two different routing systems. Specifically, server components from the app directory cannot be imported into pages, as they often use server-only features like `next/headers`.

## How We Fixed It

### 1. Pages-Compatible Supabase Client

We created a special `pages-compatibility.ts` module that provides Supabase client implementations that don't rely on server components:

```typescript
// lib/supabase/pages-compatibility.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type CookieOptions, createServerClient as createServerSSRClient } from '@supabase/ssr'

export function createPagesApiClient(context: {
  req: { cookies: { [key: string]: string } },
  res: { setHeader: (name: string, value: string[]) => void }
}) {
  // Implementation that doesn't use next/headers
}

export function createServiceRoleClient() {
  // Admin client implementation
}
```

### 2. Pages-Compatible Components

We created alternative versions of components that were using server-only features:

```typescript
// components/pages-safe/TodoList.tsx
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/index';

// Client-side only implementation
export default function PagesCompatibleTodoList({ initialTodos = [] }) {
  // Implementation...
}
```

### 3. Auto-Detection System

We implemented an automatic fix in our build process to detect problematic imports:

```javascript
// scripts/fix-build.js
function checkPagesForAppImports() {
  // Find all .tsx and .ts files in the pages directory
  const pageFiles = findFiles(pagesDir);
  
  // Check each file for problematic imports
  for (const file of pageFiles) {
    // If TodoList is imported from app directory, replace with compatible version
    if (content.includes('import TodoList from') && 
        content.includes('@/app/components/TodoList')) {
      
      // Replace with pages-compatible version
      content = content.replace(
        /import\s+TodoList\s+from\s+['"](@\/app\/components\/TodoList)['"]/g,
        `import PagesCompatibleTodoList from '@/components/pages-safe'`
      );
    }
  }
}
```

### 4. Router Compatibility Script

We created a script that automatically sets up the compatibility layer during builds:

```javascript
// scripts/ensure-router-compatibility.js
function ensureDirectoryExists(dirPath) {
  // Create directories if they don't exist
}

function createBarrelFile(filePath, importPath, named = [], defaultExport = null) {
  // Create re-export files for compatibility
}

// Create compatibility directory for pages
ensureDirectoryExists('components/pages-safe');

// Create barrel exports
createBarrelFile(
  'components/pages-safe/index.ts',
  './TodoList',
  [],
  'PagesCompatibleTodoList'
);
```

### 5. Database Schema Updates

We ensured all required tables exist in the database schema:

```sql
-- Create the todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing public access
CREATE POLICY "Allow public access to todos" 
  ON public.todos 
  USING (true) 
  WITH CHECK (true);
```

## Best Practices for Hybrid Next.js Apps

When working with both app router and pages router in the same project:

1. **Separate Concerns**: Keep app router components and pages router components in their respective directories.

2. **Create Safe Imports**: For shared functionality, create compatibility wrappers.

3. **Client Components Only in Pages**: Only use `'use client'` components in the pages directory.

4. **Avoid Server-Only Features in Pages**: Don't use `next/headers`, `cookies()`, or server actions in pages.

5. **Use Barrel Files**: Create re-export files to abstract away the implementation details.

6. **Supabase Compatibility**: Use different client creation methods depending on the context:
   - In app directory: Use `createServerClient` or `getSupabaseServerClient`
   - In pages API routes: Use `createPagesApiClient`
   - In client components (both): Use `createBrowserClient`

## Deployment Checklist

Before deploying the application:

1. **Run the test build script**: `node scripts/test-build.js`

2. **Execute the SQL script** in your Supabase project to create all required tables and policies

3. **Check environment variables** are properly configured in your Vercel project

4. **Test locally** before deploying to production

## Troubleshooting Common Issues

If you encounter build errors:

1. **"next/headers" error**: You're using a server component in pages
   - Solution: Use the compatible version from `@/components/pages-safe`

2. **No such file or directory**: Ensure all required files exist
   - Solution: Run `node scripts/ensure-router-compatibility.js`

3. **Type mismatches**: Incompatible types between different versions
   - Solution: Import from the same location consistently 