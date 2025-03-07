import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary/90 text-primary-foreground hover:bg-primary hover:shadow-luxury-button',
        destructive:
          'bg-destructive/90 text-destructive-foreground hover:bg-destructive hover:shadow-sm',
        outline:
          'border border-input/50 bg-background/80 backdrop-blur-sm hover:bg-accent/10 hover:border-accent/50 hover:text-accent-foreground',
        secondary:
          'bg-secondary/80 backdrop-blur-sm text-secondary-foreground hover:bg-secondary/90 hover:shadow-sm',
        ghost: 'hover:bg-accent/10 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        luxury: 'bg-gradient-to-r from-luxury-gold/90 to-luxury-gold/80 text-primary-foreground hover:from-luxury-gold hover:to-luxury-gold/90 hover:shadow-luxury-button border border-luxury-gold/20',
        ethereal: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-white/30 dark:bg-black/10 dark:border-white/10 dark:text-white/90 dark:hover:bg-black/20 dark:hover:border-white/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
