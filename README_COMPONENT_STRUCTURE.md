# Component Structure

## Overview

This project now uses a logically organized component structure to improve maintainability and developer experience. Components are grouped by their purpose and function.

## Component Categories

The component structure is organized into four main categories:

### 1. UI Components (`src/components/ui/`)

Basic UI components that form the building blocks of the application's interface. These are typically based on [shadcn/ui](https://ui.shadcn.com/) and implement the design system.

Examples: `Button`, `Card`, `Input`, `Select`

Usage:
```tsx
import { Button, Card } from '@/src/components/ui';
```

### 2. Layout Components (`src/components/layout/`)

Components that define the structure and positioning of content on pages.

Examples: `Sidebar`, `NavBar`, `ChatHeader`

Usage:
```tsx
import { NavBar, Sidebar } from '@/src/components/layout';
```

### 3. Feature Components (`src/components/features/`)

Feature-specific components that implement particular application functionalities.

Examples: `Chat`, `Message`, `Artifact`

Usage:
```tsx
import { Chat, Message } from '@/src/components/features';
```

### 4. Common Components (`src/components/common/`)

General-purpose, reusable components used throughout the application.

Examples: `Markdown`, `CodeBlock`, `ThemeProvider`

Usage:
```tsx
import { Markdown, CodeBlock } from '@/src/components/common';
```

## Simplified Imports

You can also import any component from the root barrel file:

```tsx
import { Button, NavBar, Chat, Markdown } from '@/src/components';
```

## Migration Status

This organization is being implemented incrementally. See [COMPONENT_MIGRATION.md](./COMPONENT_MIGRATION.md) and [COMPONENT_MIGRATION_REPORT.md](./COMPONENT_MIGRATION_REPORT.md) for details on the migration process and current status.

## Benefits

- **Improved Organization:** Components are logically grouped
- **Simpler Imports:** Use barrel files for cleaner imports
- **Better Developer Experience:** Easier to find related components
- **Consistent Patterns:** Standard component organization
- **Future-Proof:** More scalable as the application grows 