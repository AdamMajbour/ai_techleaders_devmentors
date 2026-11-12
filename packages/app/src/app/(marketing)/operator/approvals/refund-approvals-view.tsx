'use client';

import { useState } from 'react';
import type { RefundApprovalDto } from '@devmentor/core';
import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorMessage,
  LoadingMessage,
  StatusBadgePrimitive,
  apiCall,
  useAsync,
} from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';

function messageFrom<T>(result: ApiResult<T>): string | null {
  return result.ok ? null : result.error.message;
}

function formatPrice(amountMinor: number, currency: string): string {
  return `${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountMinor / 100)} ${currency}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function RefundApprovalsView() {
  const [reloads, setReloads] = useState(0);
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RefundApprovalDto | null>(null);
  const list = useAsync(
    () => apiCall<{ items: RefundApprovalDto[] }>('/api/operator/approvals'),
    [reloads],
  );
  const result = list.data;
  const items = result?.ok ? result.data.items : undefined;
  const loadError = result ? messageFrom(result) : list.error?.message ?? null;

  async function act(approval: RefundApprovalDto, action: 'approve' | 'reject') {
    setBusyApprovalId(approval.approvalId);
    setActionError(null);
    try {
      const response = await apiCall(
        `/api/operator/approvals/${encodeURIComponent(approval.approvalId)}/${action}`,
        { method: 'POST', json: {} },
      );
      if (!response.ok) setActionError(response.error.message);
      else if (action === 'reject') setRejecting(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'The refund approval could not be updated.');
    } finally {
      setBusyApprovalId(null);
      setReloads((value) => value + 1);
    }
  }

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-col gap-group">
        <div className="flex flex-wrap items-center justify-between gap-group">
          <h1 className="m-0 text-page-title font-strong text-headline">Refund approvals</h1>
        </div>
        <p className="m-0 text-body text-muted-foreground">
          Review refund requests. Approved refunds that did not complete remain here to retry.
        </p>
      </header>

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {items?.length ? (
        <ul className="m-0 list-none p-0">
          {items.map((item) => {
            const busy = busyApprovalId === item.approvalId;
            const retry = item.allowedActions.includes('retry_refund');
            return (
              <li key={item.approvalId} className="flex flex-col gap-group border-b border-border py-section">
                <div className="flex flex-wrap items-center gap-group">
                  <StatusBadgePrimitive tone={retry ? 'danger' : 'active'}>
                    {retry ? 'Refund needs retry' : 'Awaiting approval'}
                  </StatusBadgePrimitive>
                  <span className="text-meta text-muted-foreground">{formatDate(item.createdAt)}</span>
                </div>
                <p className="m-0 text-body text-foreground">
                  {formatPrice(item.amountMinor, item.currency)} · {item.reason.replaceAll('_', ' ')}
                </p>
                <p className="m-0 text-meta text-muted-foreground">
                  Seeker: {item.seekerName} · Mentor: {item.mentorName}
                </p>
                <p className="m-0 text-meta text-muted-foreground">
                  {item.bookingId ? `Booking ${item.bookingId}` : 'Vault answer'} · Payment {item.paymentStatus.replaceAll('_', ' ')}
                </p>
                <div className="flex flex-wrap gap-group">
                  {item.allowedActions.includes('approve') || retry ? (
                    <Button disabled={busy} onClick={() => void act(item, 'approve')}>
                      {busy ? 'Processing…' : retry ? 'Retry refund' : 'Approve and refund'}
                    </Button>
                  ) : null}
                  {item.allowedActions.includes('reject') ? (
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() => setRejecting(item)}
                    >
                      Reject
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : list.status === 'idle' || list.status === 'pending' ? (
        <LoadingMessage />
      ) : loadError ? (
        <ErrorMessage message={loadError} onRetry={() => setReloads((value) => value + 1)} />
      ) : (
        <EmptyState
          title="No refund approvals"
          description="New refund requests and approved refunds that need retry will appear here."
        />
      )}

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open && busyApprovalId === null) setRejecting(null);
        }}
        title="Reject this refund request?"
        description={rejecting ? `${formatPrice(rejecting.amountMinor, rejecting.currency)} for ${rejecting.bookingId ? `booking ${rejecting.bookingId}` : 'a vault answer'}. This decision cannot be undone.` : undefined}
        confirmLabel="Reject refund"
        tone="destructive"
        pending={rejecting !== null && busyApprovalId === rejecting.approvalId}
        pendingLabel="Rejecting…"
        error={actionError ?? undefined}
        onConfirm={async () => {
          if (rejecting) await act(rejecting, 'reject');
        }}
      />
    </main>
  );
}
