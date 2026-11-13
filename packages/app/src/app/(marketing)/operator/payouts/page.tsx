'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiCall, Button, Page } from '@devmentor/ui';

export default function OperatorPayoutsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: string; mentorId: string; sourceId: string; amountMinor: number; currency: string; status: string; failureCode: string | null; attempts: number; updatedAt: string }>>([]);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const result = await apiCall<typeof rows>('/api/operator/payouts/run');
    if (result.ok) setRows(result.data); else setError(result.error.message);
  }, []);
  useEffect(() => {
    let active = true;
    void apiCall<typeof rows>('/api/operator/payouts/run').then((result) => {
      if (!active) return;
      if (result.ok) setRows(result.data); else setError(result.error.message);
    });
    return () => { active = false; };
  }, []);
  async function run() {
    setBusy(true); setError(null); setMessage(null);
    const result = await apiCall<{ examined: number; paid: number; failed: number; skipped: number }>('/api/operator/payouts/run', { method: 'POST', json: {} });
    setBusy(false);
    if (result.ok) { setMessage(`Examined ${result.data.examined} credits: ${result.data.paid} transferred, ${result.data.failed} failed, ${result.data.skipped} blocked.`); await refresh(); }
    else setError(result.error.message);
  }
  return <Page title="Pilot payouts"><p className="m-0 text-body text-muted-foreground">Test-mode Connect transfers for eligible vault credits. Each ledger credit is allocated at most once.</p>{error ? <p role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}<div className="flex gap-group"><Button disabled={busy} onClick={() => void run()}>{busy ? 'Processing…' : 'Run test payout batch'}</Button><Button variant="outline" onClick={() => void refresh()}>Refresh history</Button></div><h2 className="m-0 text-section-title font-strong text-headline">Transfer audit log</h2>{rows.length ? <ul className="m-0 flex list-none flex-col gap-group p-0">{rows.map((row) => <li key={row.id} className="border-b border-border pb-group"><p className="m-0 text-body">{(row.amountMinor / 100).toFixed(2)} {row.currency} · {row.status} · {new Date(row.updatedAt).toLocaleString()}</p><p className="m-0 text-meta text-muted-foreground">Mentor {row.mentorId} · credit {row.sourceId} · attempts {row.attempts}{row.failureCode ? ` · ${row.failureCode}` : ''}</p></li>)}</ul> : <p className="m-0 text-body text-muted-foreground">No transfer allocations recorded.</p>}</Page>;
}
