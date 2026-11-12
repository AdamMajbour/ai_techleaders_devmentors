'use client';

import { useCallback } from 'react';
import { apiCallOrThrow, LoadingMessage, ErrorMessage, Page, VaultAnswerView, usePolling } from '@devmentor/ui';
import type { VaultAnswerDto } from '@devmentor/core';

function terminal(answer: VaultAnswerDto): boolean {
  return ['released', 'rejected', 'expired', 'cancelled', 'generation_failed', 'payment_failed'].includes(answer.status);
}

export function VaultAnswerPolling({ id }: { id: string }) {
  const fetcher = useCallback(async () => {
    const answer = await apiCallOrThrow<VaultAnswerDto>(`/api/vault-answers/${encodeURIComponent(id)}`);
    if (answer.status === 'pending_payment') {
      await apiCallOrThrow<VaultAnswerDto>(`/api/vault-answers/${encodeURIComponent(id)}/reconcile-payment`, { method: 'POST', json: {} });
    }
    return { ...answer, terminal: terminal(answer) };
  }, [id]);
  const state = usePolling({ fetcher, intervalMs: 5000, cursor: null });
  if (!state.data) return <Page title="Your vault answer" narrow>{state.status === 'error' ? <ErrorMessage message={state.error?.message ?? 'Answer could not be loaded.'} /> : <LoadingMessage message="Loading your answer…" />}</Page>;
  return <Page title="Your vault answer" narrow><VaultAnswerView question={state.data.question} status={state.data.status === 'pending_payment' || state.data.status === 'paid' ? 'generating' : state.data.status === 'payment_failed' ? 'generation_failed' : state.data.status} answerText={state.data.answerText} citations={state.data.citations} failureReason={state.data.failureReason} refund={state.data.refundStatus === 'pending_approval' ? 'pending_approval' : state.data.refundStatus === 'processing' ? 'processing' : state.data.refundStatus === 'refunded' ? 'refunded' : 'none'} /></Page>;
}