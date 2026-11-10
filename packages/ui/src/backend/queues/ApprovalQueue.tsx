import type { ReactNode } from 'react';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorMessage } from '../feedback/ErrorMessage';
import { LoadingMessage } from '../feedback/LoadingMessage';
import { Skeleton } from '../../components/ui/skeleton';

export type ApprovalQueueState = 'loading' | 'error' | 'empty' | 'ready';

export interface ApprovalQueueProps<TItem> {
  state: ApprovalQueueState;
  items: readonly TItem[];
  renderItem: (item: TItem) => ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  errorMessage: string;
  loadingMessage: string;
  onRetry: () => void;
}

/** Shared list pattern for mentor previews and operator approvals. */
export function ApprovalQueue<TItem>({
  state,
  items,
  renderItem,
  emptyTitle,
  emptyDescription,
  errorMessage,
  loadingMessage,
  onRetry,
}: ApprovalQueueProps<TItem>) {
  if (state === 'loading') {
    return (
      <div aria-busy="true" className="flex flex-col gap-between-groups">
        <LoadingMessage message={loadingMessage} />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (state === 'error') return <ErrorMessage message={errorMessage} onRetry={onRetry} />;
  if (state === 'empty') return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <ul className="m-0 flex max-w-session list-none flex-col p-0">{items.map(renderItem)}</ul>;
}
