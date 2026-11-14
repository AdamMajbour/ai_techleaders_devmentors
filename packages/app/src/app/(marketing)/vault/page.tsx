'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall, QuestionForm, Button, TextLink, useAsync } from '@devmentor/ui';
import type { VaultAnswerDto } from '@devmentor/core';

type AnswerList = { items: VaultAnswerDto[]; serverTime: string };
type CurrentTerms = { id: string; version: string; sha256: string };

export default function VaultPage() {
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const list = useAsync(() => apiCall<AnswerList>('/api/vault-answers'), [reload]);
  const termsRequest = useAsync(() => apiCall<CurrentTerms | null>('/api/terms/current?kind=seeker'), []);
  const terms = termsRequest.data?.ok ? termsRequest.data.data : null;
  const submit = async ({ question, acceptedTerms, termsVersionId, termsSha256 }: { question: string; acceptedTerms: true; termsVersionId: string; termsSha256: string }) => {
    const result = await apiCall<{ answer: VaultAnswerDto; checkoutUrl: string }>('/api/vault-answers', { method: 'POST', json: { question, acceptedTerms, termsVersionId, termsSha256 } });
    if (result.ok) {
      const checkoutUrl = result.data.checkoutUrl;
      router.push(checkoutUrl.startsWith('/') ? checkoutUrl : new URL(checkoutUrl).pathname);
    }
    return result;
  };
  return <main className="mx-auto flex max-w-session flex-col gap-between-groups py-between-groups">
    <h1 className="m-0 text-page-title font-strong text-headline">Ask the vault</h1>
    <p className="m-0 text-body text-foreground">An AI writes an answer from notes mentors chose to publish. Mentors whose notes are used read it before you do.</p>
    {terms ? <QuestionForm priceMinor={1000} currency="PLN" priceDescription="for one AI generated vault answer" refundRule="You pay now. If an answer cannot be written or the mentors do not approve it, you are refunded." fieldHint="Mentors whose notes are cited read your question. Do not paste secrets." termsHref="/terms" termsVersionId={terms.id} termsSha256={terms.sha256} maxLength={2000} onSubmit={submit} /> : <p role="status" className="m-0 text-body text-muted-foreground">Checkout is unavailable until current reviewed pilot terms are published.</p>}
    <section className="flex flex-col gap-group" aria-label="Your previous answers">
      <h2 className="m-0 text-section-title font-strong text-headline">Your answers</h2>
      {list.status === 'pending' ? <p role="status">Loading answers…</p> : null}
      {list.data?.ok ? <ul className="m-0 flex list-none flex-col gap-group p-0">{list.data.data.items.map((answer) => <li key={answer.id} className="flex items-center justify-between border-b border-border py-panel-compact"><span>{answer.question.slice(0, 100)} · {answer.status.replaceAll('_', ' ')}</span><TextLink href={`/vault/${answer.id}`}>Open answer</TextLink></li>)}</ul> : null}
      {list.error || (list.data && !list.data.ok) ? <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button> : null}
    </section>
  </main>;
}
