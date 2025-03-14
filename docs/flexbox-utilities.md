# Flexbox Utility Classes Guide

This guide explains how to use our standardized flexbox utility classes to maintain a consistent layout system throughout the application.

## Available Utility Classes

### Basic Layout Containers

- **`flex-center`**: Centers items both horizontally and vertically
  - Equivalent to: `flex items-center justify-center`
  
- **`flex-center-col`**: Centers items both horizontally and vertically in a column layout
  - Equivalent to: `flex flex-col items-center justify-center`

- **`flex-between`**: Space between items with alignment at center
  - Equivalent to: `flex items-center justify-between`

- **`flex-start`**: Aligns items to the start of both axes
  - Equivalent to: `flex items-start justify-start`

- **`flex-end`**: Aligns items to the end of both axes
  - Equivalent to: `flex items-end justify-end`

### Column Layouts

- **`flex-col-center`**: Column with centered items horizontally
  - Equivalent to: `flex flex-col items-center`

- **`flex-col-start`**: Column with items aligned to the start horizontally
  - Equivalent to: `flex flex-col items-start`

- **`flex-col-between`**: Column with space between items vertically
  - Equivalent to: `flex flex-col justify-between`

### Row Layouts

- **`flex-row-center`**: Row with centered items vertically
  - Equivalent to: `flex flex-row items-center`

## Usage Examples

### Centering Content

```jsx
// Before
<div className="flex items-center justify-center">
  <p>Centered content</p>
</div>

// After
<div className="flex-center">
  <p>Centered content</p>
</div>
```

### Column Layout with Centered Items

```jsx
// Before
<div className="flex flex-col items-center justify-center gap-4">
  <h2>Title</h2>
  <p>Description</p>
  <button>Action</button>
</div>

// After
<div className="flex-center-col gap-4">
  <h2>Title</h2>
  <p>Description</p>
  <button>Action</button>
</div>
```

### Row with Space Between

```jsx
// Before
<div className="flex items-center justify-between">
  <div>Left content</div>
  <div>Right content</div>
</div>

// After
<div className="flex-between">
  <div>Left content</div>
  <div>Right content</div>
</div>
```

### Row with Vertically Centered Items

```jsx
// Before
<div className="flex flex-row items-center gap-2">
  <Icon />
  <span>Label</span>
</div>

// After
<div className="flex-row-center gap-2">
  <Icon />
  <span>Label</span>
</div>
```

## When to Use

- Always use these utility classes instead of writing direct flexbox classes to ensure consistency across the application.
- You can still combine these utility classes with other Tailwind classes for spacing, sizing, etc.
- The classes handle the most common flexbox patterns, but for very specific layout needs, you may still need to use direct Tailwind flexbox utilities.

## Benefits

1. **Consistency**: Standardized layout patterns across the application
2. **Readability**: More semantic class names make the code easier to understand
3. **Maintainability**: Easier to update layout patterns application-wide
4. **Reduced Duplication**: Fewer repeated CSS patterns in the codebase
5. **Smaller CSS Bundle**: Fewer unique class combinations result in a smaller CSS output

## Implementation

These utility classes are defined in the `app/globals.css` file under the `@layer utilities` section:

```css
@layer utilities {
  /* Flexbox layout utilities */
  .flex-center {
    @apply flex items-center justify-center;
  }
  
  .flex-center-col {
    @apply flex flex-col items-center justify-center;
  }
  
  .flex-between {
    @apply flex items-center justify-between;
  }
  
  /* ... additional utility classes ... */
}
``` 