# Source Directory Structure

This directory contains the reorganized source code for the application.

## Structure

- **components/** - All UI components, organized by purpose
  - **components/common/** - General-purpose components used throughout the app
  - **components/layout/** - Components for page structure and layout
  - **components/features/** - Feature-specific components
  - **components/ui/** - Base UI components (buttons, inputs, etc.)

## Migration

We're in the process of migrating from the old component structure at the root level to this more organized structure. 

For details on the migration process and guidelines for component categorization, see the [Component Structure Migration Guide](./components/README.md).

## Using the New Structure

When working with components from the new structure, you can import them using:

```tsx
// Import specific components from a category
import { Button, Alert } from '@/src/components/ui';

// Import from multiple categories
import { NavBar } from '@/src/components/layout';
import { Chat } from '@/src/components/features';

// Import everything from the root barrel file
import { Button, NavBar, Chat } from '@/src/components';
```

This new organization makes the codebase more maintainable and easier to navigate. 