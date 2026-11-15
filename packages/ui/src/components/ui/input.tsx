import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  /** `compact` is 32 px (list rows, filters). `default` is 40 px (forms). */
  density?: 'default' | 'compact';
}

// Outline is --input (3:1). No shadow, no per-theme variants: the tokens carry both themes.
// An invalid field changes its outline here; the error text and icon come from Field.
function Input({ className, type, density = 'default', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full min-w-0 rounded-md border border-input bg-transparent font-sans text-body text-foreground transition-colors duration-(--duration-fast) placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive',
        density === 'compact' ? 'h-control-compact px-control-x-compact' : 'h-control px-control-x',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
