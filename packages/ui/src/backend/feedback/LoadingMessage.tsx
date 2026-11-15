import { cn } from '../../lib/utils';

// Announces that something is loading. Pair it with Skeleton blocks where the layout is known, and set
// aria-busy="true" on the region that loads. A polite status, so it does not interrupt the user.
export function LoadingMessage({ message = 'Loading…', className }: { message?: string; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cn('m-0 py-panel-roomy text-center text-body text-muted-foreground', className)}>
      {message}
    </p>
  );
}
