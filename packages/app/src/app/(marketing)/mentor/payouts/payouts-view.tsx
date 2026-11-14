'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiCall, Button, Page } from '@devmentor/ui';

type PayoutStatus = { account: null | { country: string; type: string; detailsSubmitted: boolean; payoutsEnabled: boolean; transfersEnabled: boolean }; ready: boolean; totals: { paid: number; pending: number; failed: number; blocked: number }; payouts: Array<{ id: string; sourceId: string; amountMinor: number; currency: string; status: string; failureCode: string | null; createdAt: string }> };
const zloty = (minor: number) => `${(minor / 100).toFixed(2)} PLN`;

export function MentorPayoutsView() {
  const [data, setData] = useState<PayoutStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const result = await apiCall<PayoutStatus>('/api/mentor/payouts');
    if (result.ok) setData(result.data); else setError(result.error.message);
  }, []);
  useEffect(() => {
    let active = true;
    void apiCall<PayoutStatus>('/api/mentor/payouts').then((result) => {
      if (!active) return;
      if (result.ok) setData(result.data); else setError(result.error.message);
    });
    return () => { active = false; };
  }, []);
  async function onboard() {
    setBusy(true); setError(null);
    const result = await apiCall<{ url: string }>('/api/mentor/payouts/onboarding', { method: 'POST', json: {} });
    setBusy(false);
    if (result.ok && result.data.url.startsWith('https://')) window.location.assign(result.data.url);
    else setError(result.ok ? 'Stripe did not return a secure onboarding link.' : result.error.message);
  }
  return <Page title="Mentor payouts">
    <p className="m-0 text-body text-muted-foreground">Connect onboarding and transfers run in Stripe test mode. No live funds are moved.</p>
    {error ? <p role="alert" className="m-0 text-body">{error}</p> : null}
    {data ? <>
      <section aria-label="Payout totals" className="grid gap-group border-y border-border py-panel-roomy sm:grid-cols-2 lg:grid-cols-4">{([['Paid', data.totals.paid], ['Pending', data.totals.pending], ['Blocked', data.totals.blocked], ['Failed attempts', data.totals.failed]] as const).map(([label, amount]) => <div key={label}><p className="m-0 text-meta text-muted-foreground">{label}</p><p className="m-0 text-section-title font-strong text-headline">{zloty(amount)}</p></div>)}</section>
      <p className="m-0 text-body">{data.account ? `Poland · Express · ${data.ready ? 'ready for transfers' : 'onboarding incomplete'}` : 'No connected account yet.'}</p>
      <div className="flex gap-group"><Button disabled={busy} onClick={() => void onboard()}>{data.account ? 'Continue Stripe onboarding' : 'Set up Stripe Express'}</Button><Button variant="outline" onClick={() => void refresh()}>Refresh status</Button></div>
      <h2 className="m-0 text-section-title font-strong text-headline">Transfer history</h2>
      {data.payouts.length ? <ul className="m-0 flex list-none flex-col gap-group p-0">{data.payouts.map((payout) => <li key={payout.id} className="border-b border-border pb-group"><p className="m-0 text-body">{zloty(payout.amountMinor)} · {payout.status} · {new Date(payout.createdAt).toLocaleString()}</p><p className="m-0 text-meta text-muted-foreground">Vault credit {payout.sourceId}{payout.failureCode ? ` · ${payout.failureCode}` : ''}</p></li>)}</ul> : <p className="m-0 text-body text-muted-foreground">No transfers recorded.</p>}
    </> : <p role="status" className="m-0 text-body">Loading payout status…</p>}
  </Page>;
}
