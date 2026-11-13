import type { AnchorHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '../../lib/utils';

export interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render the child element (for example a framework Link) instead of an <a>. */
  asChild?: boolean;
}

// Hand-written like Button: shadcn has no link primitive. A link is always underlined (WCAG 1.4.1),
// so the colour is not the only sign. Hover thickens the underline. Size and weight are inherited,
// so the link reads as part of its sentence.
export function TextLink({ className, asChild = false, ...props }: TextLinkProps) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      className={cn(
        'rounded-sm font-sans text-link underline decoration-1 underline-offset-4 transition-colors duration-(--duration-fast) hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      {...props}
    />
  );
}
