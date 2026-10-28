import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `roomy` (24 px inside) for the session view. `compact` (12 px) for dense screens. */
  density?: 'roomy' | 'compact';
}

// A panel. Separated by a hairline outline, never by a shadow (R01.1, A01). Use it only for content
// that has to stand out, such as the message box; list rows are divided by lines, not cards.
// The names Card, CardHeader and so on are kept because existing screens use them.
export function Card({ className, density = 'roomy', ...props }: CardProps) {
  return (
    <div
      data-density={density}
      className={cn('group/panel rounded-lg border border-border bg-card text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-group p-panel-roomy group-data-[density=compact]/panel:p-panel-compact',
        className,
      )}
      {...props}
    />
  );
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The heading level. Pick the one that fits the page outline. */
  as?: 'h2' | 'h3' | 'h4';
}

export function CardTitle({ className, as: Heading = 'h3', ...props }: CardTitleProps) {
  return <Heading className={cn('m-0 text-section-title font-strong text-headline', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 text-body text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-panel-roomy pb-panel-roomy group-data-[density=compact]/panel:px-panel-compact group-data-[density=compact]/panel:pb-panel-compact', className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-group px-panel-roomy pb-panel-roomy group-data-[density=compact]/panel:px-panel-compact group-data-[density=compact]/panel:pb-panel-compact', className)}
      {...props}
    />
  );
}
