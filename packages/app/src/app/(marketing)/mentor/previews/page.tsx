'use client';

import { useState } from 'react';
import { apiCall, ApprovalQueue, ReviewItem, useAsync } from '@devmentor/ui';
import type { VaultAnswerDto } from '@devmentor/core';

type Preview = VaultAnswerDto & { reviewExpiresAt: string; ownNoteTitle: string; otherMentors: string[]; canDecide: boolean };
type PreviewList = { items: Preview[]; serverTime: string };

export default function MentorPreviewsPage() {
  const [reload, setReload] = useState(0);
  const [pendingId, setPendingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const request = useAsync(() => apiCall<PreviewList>('/api/vault-previews'), [reload]);
  const items = request.data?.ok ? request.data.data.items : [];
  const state = request.status === 'pending'
    ? 'loading'
    : request.error || (request.data && !request.data.ok)
      ? 'error'
      : items.length ? 'ready' : 'empty';
  const serverTime = request.data?.ok ? request.data.data.serverTime : new Date().toISOString();

  const decide = async (id: string, decision: 'approve' | 'reject', reason?: string) => {
    setPendingId(id);
    setActionError(undefined);
    const result = await apiCall(`/api/vault-previews/${encodeURIComponent(id)}/${decision}`, {
      method: 'POST',
      json: decision === 'reject' ? { reason } : {},
    });
    setPendingId(undefined);
    if (!result.ok) setActionError(result.error.message);
    else setReload((value) => value + 1);
  };

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups py-between-groups">
      <h1 className="m-0 text-page-title font-strong text-headline">Answers to review</h1>
      <p className="m-0 max-w-session text-body text-foreground">Read the generated answer before the seeker receives it. One rejection rejects the whole answer and triggers a refund.</p>
      <ApprovalQueue
        state={state}
        items={items}
        emptyTitle="Nothing to review"
        emptyDescription="When an answer cites one of your notes, it appears here."
        errorMessage={request.error?.message ?? 'Answers could not be loaded.'}
        loadingMessage="Loading previews…"
        onRetry={() => setReload((value) => value + 1)}
        renderItem={(item) => (
          <ReviewItem
            key={item.id}
            item={{ answerId: item.id, question: item.question, answerText: item.answerText ?? '', ownNoteTitle: item.ownNoteTitle, otherMentors: item.otherMentors, expiresAt: item.reviewExpiresAt, canDecide: item.canDecide }}
            now={serverTime}
            pendingAction={pendingId === item.id ? 'approve' : undefined}
            actionError={pendingId === item.id ? actionError : undefined}
            onApprove={(id) => void decide(id, 'approve')}
            onReject={(id, reason) => void decide(id, 'reject', reason)}
          />
        )}
      />
    </main>
  );
}