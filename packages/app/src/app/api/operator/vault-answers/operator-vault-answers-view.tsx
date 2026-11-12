'use client';

import { useState } from 'react';
import { apiCall, Button, ErrorMessage, LoadingMessage, useAsync } from '@devmentor/ui';

interface OperatorAnswer {
  id: string;
  status: string;
  failureReason: string | null;
  rejectionReasons: string[];
  refundStatus: string;
  createdAt: string;
}

export function OperatorVaultAnswersView() {
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string>();
  const request = useAsync(() => apiCall<{ items: OperatorAnswer[] }>('/api/operator/vault-answers'), [reload]);
  if (request.status === 'pending') return <LoadingMessage />;
  if (request.error || !request.data?.ok) return <ErrorMessage message={request.error?.message ?? 'Could not load vault answers.'} onRetry={() => setReload((n) => n + 1)} />;
  const cancel = async (id: string) => {
    const result = await apiCall(`/api/operator/vault-answers/${encodeURIComponent(id)}/cancel`, { method: 'POST', json: {} });
    if (!result.ok) setError(result.error.message); else setReload((n) => n + 1);
  };
  return <section className="flex flex-col gap-group">
    {error ? <p role="alert">{error}</p> : null}
    {request.data.data.items.length === 0 ? <p>No vault answers yet.</p> : <ul className="m-0 list-none p-0">{request.data.data.items.map((item) => <li key={item.id} className="flex flex-col gap-group border-b border-border py-panel-compact"><strong>{item.status.replaceAll('_', ' ')}</strong><span>Failure: {item.failureReason ?? 'none'} · Refund: {item.refundStatus.replaceAll('_', ' ')}</span>{item.rejectionReasons.map((reason, index) => <span key={`${item.id}-${index}`}>Mentor reason: {reason}</span>)}{['paid', 'generating', 'pending_preview'].includes(item.status) ? <Button variant="outline" onClick={() => void cancel(item.id)}>Cancel and request refund</Button> : null}</li>)}</ul>}
  </section>;
}
