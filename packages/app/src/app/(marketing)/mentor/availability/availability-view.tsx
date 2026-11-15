'use client';

import { useState, type FormEvent } from 'react';
import { apiCall, Alert, AlertDescription, Button, ErrorMessage, Field, Input, LoadingMessage, Page, Select, useAsync } from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';

type Slot = { id: string; startsAt: string; endsAt: string };

function localInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultSlotStart(): string {
  const minTime = Date.now() + 60 * 60_000;
  return localInputValue(new Date(Math.ceil(minTime / (15 * 60_000)) * 15 * 60_000));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value));
}

export function MentorAvailabilityView() {
  const [startsAt, setStartsAt] = useState(defaultSlotStart);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useAsync(() => apiCall<Slot[]>('/api/mentors/me/availability'), [reloads]);
  const slots = list.data?.ok ? list.data.data : [];
  const loadError = list.error?.message ?? (list.data && !list.data.ok ? list.data.error.message : null);

  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiCall<Slot>('/api/mentors/me/availability', {
        method: 'POST', json: { startsAt: new Date(startsAt).toISOString(), durationMinutes },
      });
      if (!result.ok) { setError(result.error.message); return; }
      setNotice(`The ${durationMinutes}-minute session time is now available to seekers.`);
      setReloads((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The time could not be published.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelSlot(slotId: string) {
    setBusy(true);
    setError(null);
    try {
      const result: ApiResult<{ cancelled: true }> = await apiCall(`/api/mentors/me/availability/${encodeURIComponent(slotId)}`, { method: 'DELETE' });
      if (!result.ok) { setError(result.error.message); return; }
      setReloads((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The time could not be cancelled.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Session availability" narrow>
      <p className="m-0 text-body text-muted-foreground">Publish 25- or 50-minute availability windows up to 7 days ahead. Times are saved as UTC and shown to seekers in their local timezone.</p>
      <form onSubmit={createSlot} className="flex flex-col gap-between-groups">
        <Field label="Availability length" requirement="required">
          <Select value={String(durationMinutes)} onChange={(event) => setDurationMinutes(Number(event.currentTarget.value))} aria-label="Availability length">
            <option value="25">25 minutes</option>
            <option value="50">50 minutes</option>
          </Select>
        </Field>
        <Field label="Session start" hint="Choose a time at least 30 minutes from now, on a 15-minute boundary. Seekers must book at least 2 hours ahead." requirement="required">
          <Input type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.currentTarget.value)} />
        </Field>
        <div><Button type="submit" disabled={busy}>Publish available time</Button></div>
      </form>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {notice ? <p role="status" className="m-0 text-body text-foreground">{notice}</p> : null}
      {loadError ? <ErrorMessage message={loadError} onRetry={() => setReloads((value) => value + 1)} /> : null}
      {list.status === 'pending' || list.status === 'idle' ? <LoadingMessage message="Loading available times…" /> : null}
      {slots.length ? (
        <section aria-labelledby="open-slots-heading" className="flex flex-col gap-group">
          <h2 id="open-slots-heading" className="m-0 text-section-title font-strong text-headline">Open times</h2>
          <ul className="m-0 list-none p-0">
            {slots.map((slot) => (
              <li key={slot.id} className="flex flex-wrap items-center justify-between gap-group border-b border-border py-panel-compact">
                <span className="text-body text-foreground">{Math.round((Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60_000)} minutes · {formatTime(slot.startsAt)}</span>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void cancelSlot(slot.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
