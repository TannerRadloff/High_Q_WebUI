# Component Migration Guide

## Overview

We've restructured the component organization to improve maintainability, readability, and developer experience. All UI components are now organized into logical categories based on their purpose and functionality.

## New Structure

The new component structure is located in `src/components/` and organized as follows:

- `src/components/common/` - General-purpose, reusable components
- `src/components/layout/` - Components for page structure and layout
- `src/components/features/` - Feature-specific components
- `src/components/ui/` - Base UI components (buttons, inputs, etc.)

## Migration Status

Components are being migrated incrementally to minimize disruption. You can use both old and new import paths during the transition period.

## How to Migrate Your Code

### Automatic Migration

We've created helper scripts to assist with migrating component imports:

```bash
# For components - performs actual changes
npm run migrate:components

# For components - dry run (shows changes without applying them)
npm run migrate:components:dry

# For Next.js pages
npm run migrate:pages
```

### Manual Migration

If you prefer to update imports manually, use the following pattern:

```jsx
// Old way
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chat } from '@/components/chat';

// New way - import from specific categories
import { Button, Card } from '@/src/components/ui';
import { Chat } from '@/src/components/features';

// Alternative - import everything from the root barrel file
import { Button, Card, Chat } from '@/src/components';
```

## Benefits of New Structure

- **Improved Organization:** Components are logically grouped by purpose
- **Simpler Imports:** Use barrel files to import multiple components with one import statement
- **Better Developer Experience:** Easier to find and navigate related components
- **Consistent Patterns:** Standard approach for organizing and importing components
- **Future-Proof:** Scales better as the application grows

## Timeframe

This is an ongoing migration. We'll continue moving components to the new structure over time. Eventually, the old component directories will be removed once all imports have been updated.

## Questions or Issues

If you encounter any issues with the migration or have questions about the new structure, please contact the development team. 