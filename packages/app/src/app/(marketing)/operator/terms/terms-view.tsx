'use client';

import { useState } from 'react';
import { Alert, AlertDescription, Button, Textarea, apiCall } from '@devmentor/ui';

type Draft = { id: string; kind: 'seeker' | 'mentor'; version: string; sha256: string; status: string };
const scopes = ['terms', 'payment_handling', 'ai_notice_and_processors'] as const;

export function OperatorTermsView() {
  const [kind, setKind] = useState<'seeker' | 'mentor'>('seeker');
  const [version, setVersion] = useState('pilot-1');
  const [body, setBody] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createDraft() {
    setBusy(true); setMessage(null);
    const result = await apiCall<Draft>('/api/operator/terms/drafts', { method: 'POST', json: { kind, version, body } });
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setDraft(result.data);
    setMessage(`Draft created. Digest: ${result.data.sha256}`);
  }

  async function reviewAndPublish(outcome: 'pass' | 'fail') {
    if (!draft) return;
    setBusy(true); setMessage(null);
    const review = await apiCall('/api/operator/terms/reviews', {
      method: 'POST',
      json: { termsVersionId: draft.id, sha256: draft.sha256, reviewer, scopes: [...scopes], outcome },
    });
    if (!review.ok) { setBusy(false); setMessage(review.error.message); return; }
    if (outcome === 'fail') { setBusy(false); setMessage('Review recorded as failed. This version cannot be published.'); return; }
    const published = await apiCall(`/api/operator/terms/${encodeURIComponent(draft.id)}/publish`, { method: 'POST', json: {} });
    setBusy(false);
    setMessage(published.ok ? 'Reviewed version published.' : published.error.message);
    if (published.ok) setDraft(null);
  }

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <h1 className="m-0 text-page-title font-strong text-headline">Pilot terms and review</h1>
      <Alert><AlertDescription>Enter text supplied by the owner. This tool does not write legal terms or verify a reviewer’s credentials. Publishing requires an explicit recorded pass for the exact digest.</AlertDescription></Alert>
      <label className="flex flex-col gap-group">Terms type<select className="h-10 rounded-md border border-input bg-background px-control-x" value={kind} onChange={(event) => setKind(event.target.value as 'seeker' | 'mentor')}><option value="seeker">Seeker</option><option value="mentor">Mentor</option></select></label>
      <label className="flex flex-col gap-group">Version<input className="h-10 rounded-md border border-input bg-background px-control-x" value={version} onChange={(event) => setVersion(event.target.value)} /></label>
      <label className="flex flex-col gap-group">Owner-supplied terms text<Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={16} /></label>
      <Button disabled={busy || !body.trim()} onClick={() => void createDraft()}>Create immutable draft</Button>
      {draft ? <section className="flex flex-col gap-group border-t border-border pt-panel-roomy">
        <p className="m-0 break-all text-small">Draft {draft.version} · SHA-256 {draft.sha256}</p>
        <label className="flex flex-col gap-group">Verifier name<input className="h-10 rounded-md border border-input bg-background px-control-x" value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label>
        <p className="m-0 text-small">A pass attests review of terms, payment handling, and AI notice/processors for this digest.</p>
        <div className="flex flex-wrap gap-group"><Button disabled={busy || !reviewer.trim()} onClick={() => void reviewAndPublish('pass')}>Record pass and publish</Button><Button variant="outline" disabled={busy || !reviewer.trim()} onClick={() => void reviewAndPublish('fail')}>Record failed review</Button></div>
      </section> : null}
      {message ? <p role="status" className="m-0 break-words text-body">{message}</p> : null}
    </main>
  );
}
