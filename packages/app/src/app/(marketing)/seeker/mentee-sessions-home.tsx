'use client';

import { useState, useSyncExternalStore } from 'react';
import type { BookingPage } from '@devmentor/core';
import { apiCall, MySessionsView, useAsync } from '@devmentor/ui';
import Link from 'next/link';

const noSubscription = () => () => undefined;
const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const getServerTimeZone = () => 'UTC';

export function MenteeSessionsHome() {
  const [reloads, setReloads] = useState(0);
  const timeZone = useSyncExternalStore(noSubscription, getBrowserTimeZone, getServerTimeZone);
  const request = useAsync(
    () => apiCall<BookingPage>('/api/bookings?role=seeker&page=1'),
    [reloads],
  );

  const response = request.data;
  const sessions = response?.ok
    ? response.data.items.map((booking) => ({
      id: booking.id,
      mentor: {
        name: booking.mentor?.name ?? booking.counterpartName,
        headline: booking.mentor?.headline ?? 'Mentor',
        technologies: booking.mentor?.technologies.split(/\s+/).filter(Boolean) ?? [],
      },
      status: booking.status,
      refund: booking.refundStatus,
      priceMinor: booking.priceMinor,
      currency: booking.currency,
      startsAt: booking.startsAt ?? undefined,
    }))
    : [];
  const state = request.status === 'error' || (response && !response.ok)
    ? 'error'
    : request.status === 'success' && response?.ok
      ? sessions.length > 0 ? 'ready' : 'empty'
      : 'loading';

  return (
    <div className="mx-auto flex max-w-content flex-col gap-group">
      <div><Link className="text-link underline" href="/vault">Ask the mentor notes vault</Link></div>
    <MySessionsView
      state={state}
      sessions={sessions}
      timeZone={timeZone}
      hrefForSession={(id) => `/bookings/${encodeURIComponent(id)}`}
      onRetry={() => setReloads((value) => value + 1)}
    />
    </div>
  );
}
