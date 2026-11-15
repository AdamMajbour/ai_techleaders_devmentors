import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export interface SelectProps extends Omit<ComponentProps<'select'>, 'size'> {
  /** `compact` is 32 px (filters). `default` is 40 px (forms). */
  density?: 'default' | 'compact';
}

// A styled native <select>: the browser provides the keyboard behaviour, the list and the mobile
// picker, which is the most accessible and the cheapest choice for the short lists in this product
// (a technology filter). Use a combobox only when a list is long enough to need search.
function Select({ className, density = 'default', children, ...props }: SelectProps) {
  return (
    <span className="relative block w-full">
      <select
        data-slot="select"
        className={cn(
          'w-full min-w-0 appearance-none rounded-md border border-input bg-background pr-8 font-sans text-body text-foreground transition-colors duration-(--duration-fast) [&>option]:bg-background [&>option]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive',
          density === 'compact' ? 'h-control-compact pl-control-x-compact' : 'h-control pl-control-x',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-group size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

export { Select };
