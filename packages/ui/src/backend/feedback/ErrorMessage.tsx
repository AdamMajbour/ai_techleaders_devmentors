import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

export function ErrorMessage({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 py-8 text-center', className)}>
      <p className="m-0 text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
