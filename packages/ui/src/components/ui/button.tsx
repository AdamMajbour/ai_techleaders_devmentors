'use client';

import { useId, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

// The app does not load Tailwind's preflight, so the base classes reset the native button look
// themselves (border, background, font) instead of relying on it.
// Hover feedback is the token at 90% (decision 2026-10-27). Focus is a solid 2 px ring (WCAG 2.4.7).
// Blocked actions use tokens, never opacity, and stay reachable for a keyboard user (see disabledReason).
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-group rounded-md border border-transparent bg-transparent font-sans text-center text-body font-strong transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground aria-disabled:cursor-not-allowed aria-disabled:border-transparent aria-disabled:bg-muted aria-disabled:text-muted-foreground',
  {
    variants: {
      variant: {
        /** The one main action of a screen (R01.5). */
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        /** Kept for existing code. Use `outline`. */
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
        /** A secondary action. */
        outline: 'border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        /** A quiet, tertiary action. */
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        /** An action that deletes, cancels or cannot be undone. */
        /** Hover underlines the label and keeps the fill: the dark theme's destructive fill at 90% has 3.95:1 with its text (WCAG 1.4.3). */
        destructive: 'bg-destructive text-destructive-foreground hover:underline hover:underline-offset-4',
        /** Kept for existing code. Use TextLink. */
        link: 'text-link underline decoration-1 underline-offset-4 hover:decoration-2',
      },
      size: {
        /** At least 40 px: forms and the session view. A long label wraps instead of overflowing. */
        default: 'min-h-control px-control-x py-group',
        /** At least 32 px: list rows, filters, table actions (dense screens, K1). */
        sm: 'min-h-control-compact px-control-x-compact py-1',
        /** Kept for existing code. Same as `default`. */
        lg: 'min-h-control px-control-x py-group',
        /** A square 40 px button that holds only an icon. Give it an accessible name. */
        icon: 'size-control p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a <button>, passing the styles to it. */
  asChild?: boolean;
  /**
   * Why the action is unavailable. Setting it blocks the button with `aria-disabled` (it stays in the
   * keyboard order, so everyone can reach the explanation) and shows the reason as text under the button.
   * Use it instead of `disabled` whenever the user can fix the cause.
   */
  disabledReason?: string;
}

export function Button({ className, variant, size, asChild = false, disabledReason, onClick, ...props }: ButtonProps) {
  const reasonId = useId();
  const Comp = asChild ? Slot : 'button';

  if (!disabledReason) {
    return <Comp className={cn(buttonVariants({ variant, size }), className)} onClick={onClick} {...props} />;
  }

  const describedBy = [props['aria-describedby'], reasonId].filter(Boolean).join(' ');
  return (
    <span className="inline-flex flex-col items-start gap-group">
      <Comp
        {...props}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-disabled="true"
        aria-describedby={describedBy}
        onClick={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
      />
      <span id={reasonId} className="text-meta text-muted-foreground">
        {disabledReason}
      </span>
    </span>
  );
}
