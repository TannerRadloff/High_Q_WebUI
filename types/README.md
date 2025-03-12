# TypeScript Declaration Files

This directory contains TypeScript declaration files that provide type definitions for various modules used in the project.

## Type Declarations

### `lucide-react.d.ts`
Contains type definitions for the Lucide React icons library. This includes interfaces for icon props and type declarations for specific icons used throughout the application.

### `ui-components.d.ts`
Provides type definitions for UI components including:
- Alert, AlertTitle, AlertDescription
- Button
- Textarea
- Select and related components

### `next-types.d.ts`
Contains type definitions for Next.js related imports:
- Metadata interface from 'next'
- NextRequest and NextResponse from 'next/server'
- Script component from 'next/script'

### `vercel-modules.d.ts`
Provides type definitions for Vercel-specific modules:
- Analytics from '@vercel/analytics/react'
- SpeedInsights from '@vercel/speed-insights/next'

## Usage

These type declarations are automatically included in the TypeScript compilation process through the `tsconfig.json` configuration.

## Adding New Type Declarations

If you need to add type declarations for additional modules:

1. Create a new `.d.ts` file or add to an existing one
2. Use the `declare module 'module-name'` syntax
3. Define the necessary interfaces, types, and exports 