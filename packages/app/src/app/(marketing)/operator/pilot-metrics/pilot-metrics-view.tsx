'use client';

import { useState } from 'react';
import { apiCall, Button, Page } from '@devmentor/ui';

type MetricsResponse = {
  from: string;
  to: string;
  generatedAt: string;
  rows: Array<{
    category: 'session' | 'vault'; livemode: boolean; currency: string; uniqueSeekers: number;
    paidCount: number; refundedCount: number; pendingCount: number; grossMinor: number;
    refundedMinor: number; releasedCount: number; failedCount: number;
    unsuccessfulCount: number;
    mentorCreditsMinor: number;
    paidOutMinor: number;
    medianLandingSeconds: number | null; missingAttribution: number;
  }>;
};

function dateValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function PilotMetricsView() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(dateValue(monthAgo));
  const [to, setTo] = useState(dateValue(now));
  const [result, setResult] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError(null);
    const response = await apiCall<MetricsResponse>(`/api/operator/pilot-metrics?from=${encodeURIComponent(new Date(from).toISOString())}&to=${encodeURIComponent(new Date(to).toISOString())}`);
    setBusy(false);
    if (response.ok) setResult(response.data);
    else setError(response.error.message);
  }

  return <Page title="Pilot metrics">
    <p className="m-0 text-body text-muted-foreground">Payment and outcome counts are split by service, currency, and test or live mode.</p>
    <p className="m-0 text-meta text-muted-foreground">Paid includes charges later refunded; gross is the original charge and returned is the recorded refund. Vault failure rate is failed answers divided by paid answers. Windows use payment creation time; transfer totals use transfer update time.</p>
    <form className="flex flex-wrap items-end gap-group" onSubmit={(event) => { event.preventDefault(); void load(); }}>
      <label className="flex flex-col gap-1 text-label">From<input aria-label="From" type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="flex flex-col gap-1 text-label">To<input aria-label="To" type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      <Button type="submit" disabled={busy}>{busy ? 'Loading…' : 'Load metrics'}</Button>
    </form>
    {error ? <p role="alert" className="m-0 text-body">{error}</p> : null}
    {result ? <>
      <p className="m-0 text-meta text-muted-foreground">Generated {new Date(result.generatedAt).toLocaleString()}</p>
      {result.rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-body"><thead><tr>{['Service', 'Mode', 'Currency', 'Seekers', 'Paid', 'Refunded', 'Unsuccessful', 'Pending', 'Gross', 'Returned', 'Mentor credits', 'Paid out', 'Released', 'Failed', 'Vault failure rate', 'Median landing (s)', 'Missing landing'].map((header) => <th className="border-b border-border p-2" key={header}>{header}</th>)}</tr></thead><tbody>{result.rows.map((row) => <tr key={`${row.category}-${row.livemode}-${row.currency}`}>
        <td className="border-b border-border p-2">{row.category}</td><td className="border-b border-border p-2">{row.livemode ? 'Live' : 'Test'}</td><td className="border-b border-border p-2">{row.currency}</td>
        <td className="border-b border-border p-2">{row.uniqueSeekers}</td><td className="border-b border-border p-2">{row.paidCount}</td><td className="border-b border-border p-2">{row.refundedCount}</td><td className="border-b border-border p-2">{row.unsuccessfulCount}</td><td className="border-b border-border p-2">{row.pendingCount}</td>
        <td className="border-b border-border p-2">{(row.grossMinor / 100).toFixed(2)}</td><td className="border-b border-border p-2">{(row.refundedMinor / 100).toFixed(2)}</td><td className="border-b border-border p-2">{(row.mentorCreditsMinor / 100).toFixed(2)}</td><td className="border-b border-border p-2">{(row.paidOutMinor / 100).toFixed(2)}</td><td className="border-b border-border p-2">{row.releasedCount}</td><td className="border-b border-border p-2">{row.failedCount}</td><td className="border-b border-border p-2">{row.category === 'vault' && row.paidCount > 0 ? `${((row.failedCount / row.paidCount) * 100).toFixed(1)}%` : '—'}</td>
        <td className="border-b border-border p-2">{row.medianLandingSeconds ?? '—'}</td><td className="border-b border-border p-2">{row.missingAttribution}</td>
      </tr>)}</tbody></table></div> : <p className="m-0 text-body">No payments in this period.</p>}
    </> : null}
  </Page>;
}
