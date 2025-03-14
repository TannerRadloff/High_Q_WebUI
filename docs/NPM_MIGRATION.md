# Migrating from pnpm to npm

This project has been updated to use npm instead of pnpm. This document outlines the changes made and provides guidance for developers who need to manually perform this migration.

## Changes Made

1. Updated `vercel.json` to use npm commands for build and installation
2. Removed pnpm-specific configuration from `.npmrc`
3. Deleted `pnpm-lock.yaml` and generated `package-lock.json`

## Manual Migration Steps

If you need to manually migrate from pnpm to npm in your local environment, follow these steps:

1. Delete the pnpm-lock.yaml file:
   ```bash
   rm pnpm-lock.yaml
   ```

2. Update .npmrc to remove pnpm-specific settings:
   ```
   legacy-peer-deps=true
   ```

3. Update vercel.json to use npm:
   ```json
   {
     "buildCommand": "npm run build",
     "installCommand": "npm install",
     "framework": "nextjs",
     "outputDirectory": ".next"
   }
   ```

4. Install dependencies with npm to generate package-lock.json:
   ```bash
   npm install --legacy-peer-deps
   ```

5. Run the build to ensure everything works correctly:
   ```bash
   npm run build
   ```

## Automated Migration

You can also run our automated migration script:

```bash
node scripts/convert-to-npm.js
```

This script will remove pnpm-lock.yaml and install dependencies with npm to generate the package-lock.json file.

## Common Issues

- If you encounter peer dependency issues, make sure you're using the `--legacy-peer-deps` flag with npm install
- If the build fails, try cleaning the cache with `npm cache clean --force`
- React 19 RC may cause compatibility issues with some packages. If you encounter issues, check the package issues on GitHub

## Why We Migrated

We migrated from pnpm to npm for:

1. Better compatibility with Vercel deployments
2. Simplified setup for new developers
3. Consistency with other projects in our ecosystem

## Questions?

If you have any questions or encounter issues with the migration, please contact the maintainers or open an issue on the repository. 