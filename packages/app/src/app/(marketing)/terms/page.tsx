'use client';

import { useState } from 'react';
import { apiCall, Button, TermsConsent, useAsync } from '@devmentor/ui';

type TermsDocument = { id: string; kind: string; version: string; body: string; sha256: string; reviewed: boolean };
type Acceptance = { version: string; sha256: string; acceptedAt: string; subjectType: string | null; subjectId: string | null };

export default function PilotTermsPage() {
  const [kind, setKind] = useState<'seeker' | 'mentor'>('seeker');
  const [reload, setReload] = useState(0);
  const [consented, setConsented] = useState(false);
  const [acceptanceMessage, setAcceptanceMessage] = useState<string | null>(null);
  const result = useAsync(() => apiCall<TermsDocument | null>(`/api/terms/current?kind=${kind}`), [kind, reload]);
  const acceptanceResult = useAsync(() => apiCall<Acceptance[]>(`/api/terms/accepted?kind=${kind}`), [kind, reload]);
  const terms = result.data?.ok ? result.data.data : null;
  async function acceptCurrent() {
    if (!terms || !consented || !terms.reviewed) return;
    const accepted = await apiCall('/api/terms/accept', { method: 'POST', json: { kind, versionId: terms.id, sha256: terms.sha256 } });
    if (accepted.ok) setReload((value) => value + 1);
    setAcceptanceMessage(accepted.ok ? `Accepted version ${terms.version}.` : accepted.error.message);
  }
  return (
    <main className="mx-auto flex max-w-session flex-col gap-between-groups py-between-groups">
      <h1 className="m-0 text-page-title font-strong text-headline">Pilot terms</h1>
      <div className="flex gap-group" role="group" aria-label="Terms type">
        <Button variant={kind === 'seeker' ? 'default' : 'outline'} onClick={() => { setKind('seeker'); setConsented(false); setAcceptanceMessage(null); }}>Seeker terms</Button>
        <Button variant={kind === 'mentor' ? 'default' : 'outline'} onClick={() => { setKind('mentor'); setConsented(false); setAcceptanceMessage(null); }}>Mentor terms</Button>
      </div>
      {result.status === 'pending' ? <p role="status">Loading terms…</p> : null}
      {terms ? <><p className="m-0 text-small text-muted-foreground">Version {terms.version} · {terms.reviewed ? 'reviewed' : 'not reviewed'}</p><article id="current-terms" className="whitespace-pre-wrap text-body text-foreground">{terms.body}</article></> : null}
      {terms?.reviewed ? <section className="flex flex-col gap-group border-t border-border pt-panel-compact"><TermsConsent checked={consented} onCheckedChange={setConsented} termsHref="#current-terms" hint="Acceptance is stored with this version’s SHA-256 digest and timestamp." /><Button disabled={!consented} onClick={() => void acceptCurrent()}>Accept version {terms.version}</Button>{acceptanceMessage ? <p role="status" className="m-0 text-body">{acceptanceMessage}</p> : null}</section> : null}
      {acceptanceResult.data?.ok && acceptanceResult.data.data.length ? <section aria-labelledby="accepted-terms-heading" className="flex flex-col gap-group border-t border-border pt-panel-compact"><h2 id="accepted-terms-heading" className="m-0 text-section-title font-strong text-headline">Your recorded acceptance</h2><ul className="m-0 flex list-none flex-col gap-group p-0">{acceptanceResult.data.data.map((item) => <li key={`${item.sha256}-${item.acceptedAt}`} className="border-b border-border pb-group"><p className="m-0 text-body">Version {item.version} · {new Date(item.acceptedAt).toLocaleString()}</p><p className="m-0 break-all text-meta text-muted-foreground">SHA-256 {item.sha256}</p>{item.subjectType ? <p className="m-0 text-meta text-muted-foreground">Accepted for {item.subjectType}</p> : null}</li>)}</ul></section> : null}
      {result.data?.ok && !terms ? <p role="status">No terms have been published. Checkout and note publishing remain unavailable until the owner supplies the reviewed text.</p> : null}
      {result.error || (result.data && !result.data.ok) ? <><p role="alert">Terms could not be loaded.</p><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button></> : null}
    </main>
  );
}
