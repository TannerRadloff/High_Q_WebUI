# Build Process Documentation

This document explains the build process for the Next.js AI Chatbot application.

## Overview

The application uses a simplified build process that reduces reliance on custom scripts while ensuring all necessary build steps are completed.

## Build Scripts

The following build scripts are available:

- `npm run build` - The default build script that uses the simplified build process
- `npm run build:legacy` - The original build process that uses fix-build.js and post-build.js
- `npm run build:simple` - Alias for the simplified build process
- `npm run build:with-migrate` - Runs database migrations and then the simplified build process

## Simplified Build Process

The simplified build process:

1. Ensures necessary type definition files exist
2. Runs the Next.js build process
3. Creates required client reference manifests
4. Copies build artifacts between directories

### Benefits

- Reduced complexity and fewer failure points
- Better alignment with Next.js conventions
- Easier to maintain and debug
- More transparent build process

## Environment Variables

Environment variables are configured in next.config.js using the env property:

```javascript
env: {
  NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
},
```

This eliminates the need for runtime manipulation of environment variables.

## Type Definitions

Type definitions required for the build are committed to the repository in the src/types directory:

- src/types/artifact.ts - Defines UI artifact types
- src/types/index.ts - Exports from all type files

## Troubleshooting

If you encounter build issues with the simplified process:

1. Try the legacy build process with `npm run build:legacy`
2. Ensure all dependencies are installed with `npm install`
3. Check for error messages related to missing files or directories
4. Verify that environment variables are properly set

## Future Improvements

- Further reduce reliance on custom scripts
- Move more configuration to standard Next.js configuration files
- Use Vercel environment variables for deployment-specific settings
- Incorporate build process into CI/CD pipeline 