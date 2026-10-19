import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-10 text-center', className)}>
      <p className="m-0 font-medium">{title}</p>
      {description && <p className="m-0 text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
