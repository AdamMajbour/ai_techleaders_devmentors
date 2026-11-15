import { CircleAlert } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

// The error state of a list or a view that could not load. It says what happened and what to do, with an
// icon and words so colour is not the only cue (WCAG 1.4.1), and it is announced at once (role="alert").
// For an error about one field use Field; for a message inside a form use Alert.
export function ErrorMessage({
  message,
  onRetry,
  className,
}: {
  /** What happened and what to do: "Questions could not be loaded. Check your connection and try again." */
  message: string;
  /** Adds a "Try again" button. Give it whenever trying again can work. */
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-between-groups py-panel-roomy text-center', className)}>
      <p className="m-0 flex max-w-(--measure-text) items-start gap-group text-body text-destructive">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
