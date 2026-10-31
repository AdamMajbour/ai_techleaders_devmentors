import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

// A placeholder block where content is loading. It does NOT pulse: an endless animation is decorative
// motion (A01, WCAG 2.2.2). The loading state is announced as text by LoadingMessage, so the blocks
// are hidden from assistive technology. Mark the region that loads with aria-busy="true".
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
