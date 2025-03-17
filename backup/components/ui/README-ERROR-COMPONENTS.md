# Error UI Components

This directory contains a consolidated implementation of error UI components that were previously duplicated across the codebase.

## Components

- `error-message.tsx`: A reusable error message component with different error types and action buttons.
- `error-boundary.tsx`: A React error boundary to catch and display errors gracefully.

## ErrorMessage Component

The ErrorMessage component provides a consistent way to display error messages across the application with support for:

- Multiple error types (general, authentication, network, validation, server)
- Default messages for each error type
- Optional retry and login actions
- Dismiss functionality
- Animation with Framer Motion

### Usage

```tsx
import { ErrorMessage } from '@/src/components/ui/error-message';
// or
import { ErrorMessage } from '@/components/ui';

function MyComponent() {
  return (
    <ErrorMessage
      type="authentication"
      message="You need to log in to access this feature"
      onLogin={() => window.location.href = '/login'}
      onDismiss={() => setShowError(false)}
      className="my-custom-class"
    />
  );
}
```

## ErrorBoundary Component

The ErrorBoundary component catches JavaScript errors anywhere in its child component tree and displays a fallback UI instead of crashing the application.

### Usage

```tsx
import { ErrorBoundary } from '@/src/components/ui/error-boundary';
// or
import { ErrorBoundary } from '@/components/ui';

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Notes

- These components replace the duplicate implementations that were previously in both `src/components/ui` and `components/ui`.
- We've added a path alias in `tsconfig.json` to support both import paths to maintain backward compatibility. 