'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall, Alert, AlertDescription, Button, ErrorMessage, LoadingMessage, PriceNotice, TextLink, useAsync } from '@devmentor/ui';
import type { VaultAnswerDto } from '@devmentor/core';

export function VaultMockCheckoutView({ answerId }: { answerId: string }) {
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const request = useAsync(() => apiCall<VaultAnswerDto>(`/api/vault-answers/${encodeURIComponent(answerId)}`), [answerId, reload]);
  if (request.status === 'idle' || request.status === 'pending') return <main className="mx-auto max-w-session p-panel-compact"><LoadingMessage /></main>;
  if (request.error || !request.data?.ok) return <main className="mx-auto max-w-session p-panel-compact"><ErrorMessage message={request.error?.message ?? (request.data && !request.data.ok ? request.data.error.message : 'Checkout unavailable.')} onRetry={() => setReload((n) => n + 1)} /></main>;
  const answer = request.data.data;
  const finish = async (outcome: 'complete' | 'fail') => {
    setBusy(true);
    const result = await apiCall<VaultAnswerDto>(`/api/vault-answers/${encodeURIComponent(answerId)}/mock-payment`, { method: 'POST', json: { outcome } });
    setBusy(false);
    if (!result.ok) { setError(result.error.message); return; }
    router.push(`/vault/${encodeURIComponent(answerId)}`);
  };
  return <main className="mx-auto flex max-w-session flex-col gap-between-groups p-panel-compact">
    <h1 className="m-0 text-page-title font-strong text-headline">Local mock checkout</h1>
    <Alert><AlertDescription>This development checkout never charges a card or contacts a payment provider.</AlertDescription></Alert>
    <PriceNotice amountMinor={answer.priceMinor} currency={answer.currency} description="for one AI generated vault answer" refundRule="This local test payment never charges a card." />
    {answer.status !== 'pending_payment' ? <p role="status">This checkout is already {answer.status.replaceAll('_', ' ')}.</p> : <div className="flex gap-group"><Button disabled={busy} onClick={() => void finish('complete')}>Complete test payment</Button><Button variant="outline" disabled={busy} onClick={() => void finish('fail')}>Fail test payment</Button></div>}
    {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <TextLink href="/vault">Return to the vault</TextLink>
  </main>;
}
