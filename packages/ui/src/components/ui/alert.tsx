import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, Info } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

// A message that stays on the page until the cause is gone. Errors that need action are an Alert,
// never a toast. No shadow, no tinted fill: an outline and an icon carry the meaning (R01.1, A01).
const alertVariants = cva('flex w-full items-start gap-group rounded-lg border bg-card p-panel-compact text-body text-card-foreground', {
  variants: {
    variant: {
      /** Information: a test-mode banner, a notice. Announced politely. */
      default: 'border-input',
      /** Something failed or needs correcting. Announced at once. */
      destructive: 'border-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, children, role, ...props }: AlertProps) {
  const Icon = variant === 'destructive' ? CircleAlert : Info;
  return (
    <div
      data-variant={variant ?? 'default'}
      role={role ?? (variant === 'destructive' ? 'alert' : 'status')}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
      <div className="flex flex-col gap-group">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 text-label font-strong text-headline', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 text-body text-muted-foreground', className)} {...props} />;
}
