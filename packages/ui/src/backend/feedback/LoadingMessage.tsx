import { cn } from '../../lib/utils';

export function LoadingMessage({ message = 'Loading…', className }: { message?: string; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cn('m-0 py-8 text-center text-sm text-muted-foreground', className)}>
      {message}
    </p>
  );
}
