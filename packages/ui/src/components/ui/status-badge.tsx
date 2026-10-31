import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

// Hand-written like Button: shadcn's Badge is a decorative chip, a status needs text and a rule.
// The text is always there, so a status is never shown by colour alone (WCAG 1.4.1).
// Only three tones exist. A success and a warning tone are not defined yet because the accent and the
// colour of success collide (conflict K3 in referencje.md); see What is missing.
export const statusBadgeVariants = cva(
  'inline-flex items-center gap-group rounded-sm border px-group py-1 font-sans text-meta font-strong',
  {
    variants: {
      tone: {
        /** A plain state: Paid, Waiting, Closed. */
        neutral: 'border-transparent bg-muted text-foreground',
        /** A state that needs the user's attention or is the current one: Awaiting your review. */
        active: 'border-transparent bg-primary text-primary-foreground',
        /** A negative outcome: Declined, Failed, Expired. */
        danger: 'border-destructive bg-transparent text-destructive',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  /** An optional lucide icon (size-4, aria-hidden). It supports the text, it never replaces it. */
  icon?: ReactNode;
}

export function StatusBadge({ className, tone, icon, children, ...props }: StatusBadgeProps) {
  return (
    <span data-tone={tone ?? 'neutral'} className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}
