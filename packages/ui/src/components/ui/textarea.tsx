import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 w-full rounded-md border border-input bg-transparent px-control-x py-group font-sans text-body text-foreground transition-colors duration-(--duration-fast) placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
