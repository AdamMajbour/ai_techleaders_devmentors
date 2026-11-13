'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiCall, Button, Page } from '@devmentor/ui';

type Hold = { id: string; contentType: string; contentId: string; reason: string; createdAt: string; releasedAt: string | null; releaseReason: string | null };
type SweepRun = { id: string; status: string; startedAt: string; completedAt: string | null; limitCount: number; processedCount: number; skippedHoldCount: number; errorCode: string | null };

export function RetentionHoldsView() {
  const [contentType, setContentType] = useState('message');
  const [contentId, setContentId] = useState('');
  const [reason, setReason] = useState('');
  const [holds, setHolds] = useState<Hold[]>([]);
  const [runs, setRuns] = useState<SweepRun[]>([]);
  const [releaseReasons, setReleaseReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiCall<Hold[]>('/api/operator/retention/holds');
    if (result.ok) setHolds(result.data); else setError(result.error.message);
  }, []);
  const loadRuns = useCallback(async () => {
    const result = await apiCall<SweepRun[]>('/api/operator/retention/runs');
    if (result.ok) setRuns(result.data); else setError(result.error.message);
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([
      apiCall<Hold[]>('/api/operator/retention/holds'),
      apiCall<SweepRun[]>('/api/operator/retention/runs'),
    ]).then(([holdsResult, runsResult]) => {
      if (!active) return;
      if (holdsResult.ok) setHolds(holdsResult.data); else setError(holdsResult.error.message);
      if (runsResult.ok) setRuns(runsResult.data); else setError(runsResult.error.message);
    });
    return () => { active = false; };
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    const result = await apiCall<Hold>('/api/operator/retention/holds', { method: 'POST', json: { contentType, contentId, reason } });
    setBusy(false);
    if (result.ok) { setContentId(''); setReason(''); setMessage('Legal hold recorded.'); await load(); await loadRuns(); }
    else setError(result.error.message);
  }

  async function release(id: string) {
    setBusy(true); setError(null); setMessage(null);
    const result = await apiCall(`/api/operator/retention/holds/${encodeURIComponent(id)}/release`, { method: 'POST', json: { reason: releaseReasons[id] ?? '' } });
    setBusy(false);
    if (result.ok) { setMessage('Hold release recorded.'); await load(); await loadRuns(); }
    else setError(result.error.message);
  }

  return <Page title="Retention legal holds">
    <p className="m-0 text-body text-muted-foreground">Active holds are skipped by the pilot content sweep. Creating and releasing a hold records the operator, timestamp, and reason.</p>
    <form onSubmit={(event) => void create(event)} className="flex flex-col gap-group border-y border-border py-panel-compact">
      <label className="flex flex-col gap-1 text-label">Content type<select value={contentType} onChange={(event) => setContentType(event.target.value)}><option value="message">Session message</option><option value="booking_question">Session question</option><option value="note">Mentor note</option><option value="vault_question">Vault question</option><option value="vault_answer">Vault answer</option><option value="citation">Citation snapshot</option></select></label>
      <label className="flex flex-col gap-1 text-label">Content record UUID<input required value={contentId} onChange={(event) => setContentId(event.target.value)} /></label>
      <label className="flex flex-col gap-1 text-label">Reason<textarea required minLength={5} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <div><Button type="submit" disabled={busy}>Record legal hold</Button></div>
    </form>
    <div className="flex items-center gap-group"><h2 className="m-0 text-section-title font-strong text-headline">Hold audit log</h2><Button variant="outline" onClick={() => void load()}>Refresh</Button></div>
    {error ? <p role="alert" className="m-0 text-body">{error}</p> : null}{message ? <p role="status" className="m-0 text-body">{message}</p> : null}
    {holds.length ? <ul className="m-0 flex list-none flex-col gap-group p-0">{holds.map((hold) => <li key={hold.id} className="flex flex-col gap-group border-b border-border pb-group"><p className="m-0 text-body">{hold.contentType} · {hold.contentId} · created {new Date(hold.createdAt).toLocaleString()}</p><p className="m-0 text-meta text-muted-foreground">{hold.reason}</p>{hold.releasedAt ? <p className="m-0 text-meta text-muted-foreground">Released {new Date(hold.releasedAt).toLocaleString()}: {hold.releaseReason}</p> : <><label className="flex flex-col gap-1 text-label">Release reason<textarea minLength={5} maxLength={2000} value={releaseReasons[hold.id] ?? ''} onChange={(event) => setReleaseReasons({ ...releaseReasons, [hold.id]: event.target.value })} /></label><div><Button variant="outline" disabled={busy || (releaseReasons[hold.id] ?? '').trim().length < 5} onClick={() => void release(hold.id)}>Release hold</Button></div></>}</li>)}</ul> : <p className="m-0 text-body text-muted-foreground">No holds loaded. Refresh the audit log.</p>}
    <div className="flex items-center gap-group"><h2 className="m-0 text-section-title font-strong text-headline">Sweep run history</h2><Button variant="outline" onClick={() => void loadRuns()}>Refresh</Button></div>
    {runs.length ? <ul className="m-0 flex list-none flex-col gap-group p-0">{runs.map((run) => <li key={run.id} className="border-b border-border pb-group"><p className="m-0 text-body">{run.status} · {new Date(run.startedAt).toLocaleString()} · {run.processedCount} records erased · {run.skippedHoldCount} active holds</p>{run.errorCode ? <p className="m-0 text-meta text-muted-foreground">{run.errorCode}</p> : null}</li>)}</ul> : <p className="m-0 text-body text-muted-foreground">No retention sweep has run.</p>}
  </Page>;
}
