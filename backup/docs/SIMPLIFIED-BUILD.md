# Simplified Build Process

This document explains the simplified build process that reduces reliance on custom scripts.

## Background

The original build process used two custom scripts:
- `fix-build.js`: Pre-build script that sets environment variables, creates necessary files, and fixes compatibility issues
- `post-build.js`: Post-build script that creates client reference manifests and copies build artifacts

These scripts add complexity and potential failure points to the build process.

## Simplified Approach

The simplified build process:

1. Moves environment variable configuration to `next.config.js`
2. Combines essential pre-build and post-build tasks into a single script
3. Eliminates unnecessary compatibility checks and fixes

## How to Use

### Option 1: Use the simplified build script

```bash
npm run build:simple
```

This uses the `simplified-build.js` script which:
- Creates necessary type definition files
- Runs the Next.js build
- Creates client reference manifests
- Copies build artifacts

### Option 2: Use the standard Next.js build with updated config

If you want to further simplify, you can:

1. Ensure type definition files exist in your repository
2. Update `next.config.js` with environment variables
3. Run the standard Next.js build:

```bash
next build
```

## Benefits

- Reduced complexity and fewer failure points
- Better alignment with Next.js conventions
- Easier to maintain and debug
- More transparent build process

## Limitations

The simplified build process may not handle all edge cases that the original scripts addressed. If you encounter build issues, you may need to:

1. Add specific fixes to the simplified build script
2. Temporarily revert to the original build process
3. Manually create necessary files or directories

## Next Steps

To further simplify the build process:

1. Gradually eliminate reliance on custom scripts
2. Move more configuration to `next.config.js`
3. Use Vercel environment variables for deployment-specific settings
4. Ensure all necessary type definitions are committed to the repository 