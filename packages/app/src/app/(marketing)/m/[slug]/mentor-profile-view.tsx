'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MentorProfileDto } from '@devmentor/core';
import { apiCall, ErrorMessage, LoadingMessage, Skeleton, TextLink, useAsync } from '@devmentor/ui';
import { captureBookingAttribution, type BookingSource } from '@/lib/booking-attribution';
import { BookingQuestionForm } from './booking-question-form';

const ACTIVITY_LABELS: Record<MentorProfileDto['activity'], string> = {
  within_hour: 'Active within the last hour',
  today: 'Active today',
  earlier: 'Active earlier',
  never: 'No activity recorded',
};

function safeExternalHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function MentorProfileView({ slug, source }: { slug: string; source: BookingSource }) {
  const [reloads, setReloads] = useState(0);
  const profileRequest = useAsync(
    () => apiCall<MentorProfileDto>(`/api/mentors?slug=${encodeURIComponent(slug)}`),
    [slug, reloads],
  );
  const result = profileRequest.data;
  const profile = result?.ok ? result.data : undefined;
  const error = result && !result.ok ? result.error.message : profileRequest.error?.message;

  useEffect(() => {
    captureBookingAttribution(slug, source);
  }, [slug, source]);

  if (profileRequest.status === 'idle' || profileRequest.status === 'pending') {
    return (
      <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact" aria-busy="true">
        <LoadingMessage />
        <Skeleton className="h-control w-2/3" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  if (!profile || error) {
    return (
      <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
        <ErrorMessage
          message={error ?? 'This mentor profile could not be loaded. Try again.'}
          onRetry={() => setReloads((count) => count + 1)}
        />
        <TextLink asChild>
          <Link href="/mentors">Back to mentors</Link>
        </TextLink>
      </main>
    );
  }

  const publicWorkHref = safeExternalHref(profile.publicWorkUrl);

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <TextLink asChild>
        <Link href="/mentors">Back to mentors</Link>
      </TextLink>
      <article className="flex flex-col gap-between-groups">
        <header className="flex flex-col gap-group">
          <h1 className="m-0 text-page-title font-strong text-headline">{profile.slug}</h1>
          <p className="m-0 text-section-title text-foreground">{profile.headline}</p>
        </header>
        <p className="m-0 whitespace-pre-wrap text-body text-foreground">{profile.bio}</p>
        <section aria-labelledby="mentor-technologies">
          <h2 id="mentor-technologies" className="m-0 text-label font-strong text-headline">
            Technologies
          </h2>
          <p className="m-0 text-body text-foreground">
            {profile.technologies.split(/\s+/).filter(Boolean).map((technology) => technology.replaceAll('-', ' ')).join(', ')}
          </p>
        </section>
        <p className="m-0 text-body text-foreground">
          Public work:{' '}
          {publicWorkHref ? (
            <TextLink href={publicWorkHref}>{profile.publicWorkUrl}</TextLink>
          ) : (
            profile.publicWorkUrl
          )}
        </p>
        {profile.githubUrl ? (
          <p className="m-0 text-body text-foreground">
            GitHub: <TextLink href={profile.githubUrl}>{profile.githubUrl}</TextLink>
          </p>
        ) : null}
        <section aria-labelledby="mentor-activity">
          <h2 id="mentor-activity" className="m-0 text-label font-strong text-headline">
            Activity
          </h2>
          <p className="m-0 text-body text-foreground">{ACTIVITY_LABELS[profile.activity]}</p>
          <p className="m-0 text-meta text-muted-foreground">
            Activity is shown in broad buckets, not precise timestamps, and is not a promise of reply time.
          </p>
        </section>
        <BookingQuestionForm profile={profile} source={source} />
        <section id="pilot-booking-terms" aria-labelledby="pilot-booking-terms-title" className="flex flex-col gap-group">
          <h2 id="pilot-booking-terms-title" className="m-0 text-label font-strong text-headline">
            Pilot booking terms
          </h2>
          <p className="m-0 text-body text-foreground">
            You pay 25 EUR for a 25-minute text session. Your question is shared only with this mentor.
            If the mentor does not accept or does not show up, you are refunded.
          </p>
        </section>
      </article>
    </main>
  );
}
