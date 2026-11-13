'use client';

import { useState } from 'react';
import type { ApiResult } from '@devmentor/ui';
import { ActionButton, Card, CardContent, CardDescription, CardHeader, CardTitle, StatusBadge } from '@devmentor/ui';

const STATUS_LABELS = {
  awaiting_payment: { text: 'Awaiting payment', tone: 'neutral' },
  awaiting_decision: { text: 'Awaiting your decision', tone: 'active' },
  accepted: { text: 'Accepted', tone: 'active' },
  declined: { text: 'Declined', tone: 'danger' },
  refund_processing: { text: 'Refund processing', tone: 'neutral' },
} as const;

const STATUS_STATES = Object.keys(STATUS_LABELS);

export function PreviewInteractions() {
  const [failedOnce, setFailedOnce] = useState(false);
  const [completedAction, setCompletedAction] = useState<string | null>(null);

  const allowedActions: {
    label: string;
    confirm?: string;
    run: () => Promise<ApiResult<unknown>>;
  }[] = [
    {
      label: 'Approve refund',
      confirm: 'Approve this refund?',
      run: async () => ({ ok: true, status: 200, data: {} }),
    },
    {
      label: 'Retry a server error',
      run: async () => {
        if (!failedOnce) {
          setFailedOnce(true);
          return {
            ok: false,
            status: 409,
            error: { code: 'conflict', message: 'This action is no longer available. Try again.' },
          };
        }
        return { ok: true, status: 200, data: {} };
      },
    },
    {
      label: 'Simulate a slow action',
      run: async () => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return { ok: true, status: 200, data: {} };
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>StatusBadge states</CardTitle>
          <CardDescription>Each state includes visible text as well as a semantic tone.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="m-0 flex list-none flex-wrap items-center gap-between-groups p-0">
            {STATUS_STATES.map((status) => (
              <li key={status}>
                <StatusBadge status={status} labels={STATUS_LABELS} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed actions</CardTitle>
          <CardDescription>Actions below simulate confirmation, loading, success and a retryable server error.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-between-groups">
          {allowedActions.map((action) => (
            <ActionButton
              key={action.label}
              {...action}
              onDone={() => setCompletedAction(action.label)}
            />
          ))}
          {completedAction && (
            <p role="status" className="m-0 w-full text-meta text-muted-foreground">
              {completedAction} completed.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
