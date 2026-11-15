import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Nothing to show. Two cases need different words and a different action:
// "nothing here yet" (action: create the first one) and "no results for these filters" (action: clear them).
// No illustration and no icon tile: the words and the next step are the content (A01).
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  /** What is empty, in plain words: "No questions yet". */
  title: string;
  /** Why it is empty and what to do next. */
  description?: string;
  /** The next step, usually a Button or a TextLink. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-group py-panel-roomy text-center', className)}>
      <p className="m-0 text-body font-strong text-headline">{title}</p>
      {description && <p className="m-0 max-w-(--measure-text) text-body text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
