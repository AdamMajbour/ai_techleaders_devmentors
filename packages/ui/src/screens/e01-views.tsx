'use client';

// Example compositions of the E01 screens (the booking flow), built only from the design system. They exist to
// document the state map of each screen in Storybook and to be copied into pages. They are not exported from the
// package: a page in `app` composes the same components with real data and routing.
import { useState, type FormEvent, type ReactNode } from 'react';

import { Page } from '../backend/layout/Page';
import { EmptyState } from '../backend/feedback/EmptyState';
import { ErrorMessage } from '../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../backend/feedback/LoadingMessage';
import type { ApiResult } from '../backend/api/types';
import { BookingRow, type BookingRowData } from '../components/bookings/BookingRow';
import { QuestionForm } from '../components/bookings/QuestionForm';
import { MentorRow, type MentorRowData } from '../components/mentors/MentorRow';
import { SessionThread, type SessionMessage } from '../components/messages/SessionThread';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { TextLink } from '../components/ui/text-link';

export function TestModeBanner() {
  return (
    <Alert>
      <AlertTitle>Test mode</AlertTitle>
      <AlertDescription>Payments in this environment are not real. No money is taken and the session does not count toward the pilot.</AlertDescription>
    </Alert>
  );
}

// ---- Login and verify (E01-T01: magic link, per the booking spec) ----

export type LoginState = 'form' | 'sending' | 'sent' | 'rateLimited' | 'serverError';

export function LoginView({ state }: { state: LoginState }) {
  const [email, setEmail] = useState('ada@example.com');
  const [touched, setTouched] = useState(false);
  const invalid = touched && !/^\S+@\S+\.\S+$/.test(email);
  if (state === 'sent') {
    return (
      <Page title="Check your email" narrow>
        <p className="m-0 text-body text-foreground">
          If {email} is invited to the pilot, we sent a sign-in link to it. The link works once and expires in 15 minutes.
        </p>
        <TextLink href="#login" className="w-fit">
          Use another email address
        </TextLink>
      </Page>
    );
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
  }
  return (
    <Page title="Sign in" narrow>
      <p className="m-0 text-body text-foreground">We send a link to your email. There is no password.</p>
      {state === 'rateLimited' ? (
        <Alert variant="destructive">
          <AlertDescription>Too many requests. Wait a few minutes and try again.</AlertDescription>
        </Alert>
      ) : null}
      {state === 'serverError' ? (
        <Alert variant="destructive">
          <AlertDescription>The link could not be sent. Check your connection and try again.</AlertDescription>
        </Alert>
      ) : null}
      <form onSubmit={submit} noValidate className="flex flex-col gap-between-groups">
        <Field label="Email" error={invalid ? 'Enter an email address, for example name@example.com.' : undefined}>
          <Input type="email" autoComplete="email" value={email} disabled={state === 'sending'} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched(true)} />
        </Field>
        <div>
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send the link'}
          </Button>
        </div>
      </form>
    </Page>
  );
}

export type VerifyState = 'checking' | 'invalidLink' | 'serverError';

export function VerifyView({ state }: { state: VerifyState }) {
  return (
    <Page title="Signing you in" narrow>
      {state === 'checking' ? <LoadingMessage message="Checking your link…" /> : null}
      {state === 'invalidLink' ? (
        <div className="flex flex-col items-start gap-group">
          <ErrorMessage message="This link has expired or was already used. Request a new one." />
          <TextLink href="#login">Request a new link</TextLink>
        </div>
      ) : null}
      {state === 'serverError' ? <ErrorMessage message="We could not check your link. Check your connection and try again." onRetry={() => {}} /> : null}
    </Page>
  );
}

// ---- Mentors list (E01-S01) and mentor page with the question form (E01-S02) ----

export type MentorsState = 'loading' | 'ready' | 'empty' | 'error';

export function MentorsListView({ state, mentors }: { state: MentorsState; mentors: MentorRowData[] }) {
  const [technology, setTechnology] = useState('');
  const technologies = [...new Set(mentors.flatMap((mentor) => mentor.technologies))].sort();
  const shown = technology ? mentors.filter((mentor) => mentor.technologies.includes(technology)) : mentors;
  return (
    <Page title="Mentors">
      {state === 'ready' ? (
        <div className="max-w-session">
          <Field label="Technology" orientation="stacked">
            <Select density="compact" value={technology} onChange={(event) => setTechnology(event.target.value)}>
              <option value="">All technologies</option>
              {technologies.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}
      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-between-groups">
          <LoadingMessage message="Loading mentors…" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}
      {state === 'error' ? <ErrorMessage message="Mentors could not be loaded. Check your connection and try again." onRetry={() => {}} /> : null}
      {state === 'empty' ? <EmptyState title="No mentors yet" description="Mentors are invited one by one. Check back soon." /> : null}
      {state === 'ready' ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((mentor) => (
            <MentorRow key={mentor.id} mentor={mentor} priceMinor={2500} currency="EUR" href={`#${mentor.id}`} headingLevel={2} />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}

export function MentorProfileView({ mentor, onSubmit }: { mentor: MentorRowData; onSubmit: (input: { question: string; acceptedTerms: true }) => Promise<ApiResult<unknown>> }) {
  return (
    <Page title={mentor.name} narrow>
      <TestModeBanner />
      <section aria-label="About the mentor" className="flex flex-col gap-group">
        <p className="m-0 text-body text-foreground">{mentor.headline}</p>
        <p className="m-0 text-label text-muted-foreground">{mentor.technologies.join(' · ')}</p>
        {mentor.publicWork ? (
          <p className="m-0 text-label">
            Public work: <TextLink href={mentor.publicWork.href}>{mentor.publicWork.label}</TextLink>
          </p>
        ) : null}
      </section>
      <h2 className="m-0 text-section-title font-strong text-headline">Ask a question</h2>
      <QuestionForm
        mentorName={mentor.name}
        priceMinor={2500}
        currency="EUR"
        termsHref="#terms"
        termsHint="Your question is kept until the pilot ends and then deleted."
        onSubmit={onSubmit}
      />
    </Page>
  );
}

// ---- Payment return (E01-S02, Grill 7) ----

export type PaymentReturnState = 'confirming' | 'slow' | 'paid' | 'failed' | 'cancelled' | 'reconcileFailed';

export function PaymentReturnView({ state, testMode = false }: { state: PaymentReturnState; testMode?: boolean }) {
  return (
    <Page title="Your payment" narrow>
      {testMode ? <TestModeBanner /> : null}
      {state === 'confirming' ? <LoadingMessage message="Confirming your payment…" /> : null}
      {state === 'slow' ? (
        <div className="flex flex-col gap-group">
          <LoadingMessage message="Still confirming your payment…" />
          <p className="m-0 text-body text-foreground">This takes longer than usual. You can leave this page: we keep checking, and the session appears in your sessions when the payment is confirmed.</p>
        </div>
      ) : null}
      {state === 'paid' ? (
        <div className="flex flex-col items-start gap-group">
          <p role="status" className="m-0 text-body text-foreground">
            Payment received. The mentor has your question and will answer it or decline it. If they decline or do not answer, you are refunded.
          </p>
          <Button asChild>
            <a href="#bookings">See your sessions</a>
          </Button>
        </div>
      ) : null}
      {state === 'failed' ? (
        <div className="flex flex-col items-start gap-group">
          <Alert variant="destructive">
            <AlertTitle>The payment failed</AlertTitle>
            <AlertDescription>Your card was not charged. Check the card details and try again.</AlertDescription>
          </Alert>
          <Button asChild>
            <a href="#mentor">Try again</a>
          </Button>
        </div>
      ) : null}
      {state === 'cancelled' ? (
        <div className="flex flex-col items-start gap-group">
          <p className="m-0 text-body text-foreground">You left the payment page. Nothing was charged and your question was not sent.</p>
          <Button asChild variant="outline">
            <a href="#mentor">Back to the mentor</a>
          </Button>
        </div>
      ) : null}
      {state === 'reconcileFailed' ? (
        <ErrorMessage message="We could not confirm the payment yet. If your card was charged, the session appears in your sessions within a few minutes. Otherwise try again." onRetry={() => {}} />
      ) : null}
    </Page>
  );
}

// ---- Bookings of the seeker and of the mentor (E01-S03) ----

export type BookingsState = 'loading' | 'ready' | 'empty' | 'error';

export function BookingsView({
  state,
  viewer,
  bookings,
  pendingId,
  errorId,
  actionError,
}: {
  state: BookingsState;
  viewer: 'seeker' | 'mentor';
  bookings: BookingRowData[];
  pendingId?: string;
  errorId?: string;
  actionError?: string;
}) {
  const title = viewer === 'seeker' ? 'My sessions' : 'Questions for you';
  return (
    <Page title={title}>
      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col">
          <LoadingMessage message={viewer === 'seeker' ? 'Loading your sessions…' : 'Loading your questions…'} />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-group border-b border-border py-panel-compact">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}
      {state === 'error' ? <ErrorMessage message={`${viewer === 'seeker' ? 'Sessions' : 'Questions'} could not be loaded. Check your connection and try again.`} onRetry={() => {}} /> : null}
      {state === 'empty' ? (
        <EmptyState
          title={viewer === 'seeker' ? 'No sessions yet' : 'No questions waiting'}
          description={viewer === 'seeker' ? 'Pick a mentor and ask your first question. Your sessions appear here.' : 'When someone pays for a question to you, it appears here.'}
          action={
            viewer === 'seeker' ? (
              <Button asChild>
                <a href="#mentors">Find a mentor</a>
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {state === 'ready' ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {bookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              viewer={viewer}
              href={`#${booking.id}`}
              onAccept={() => {}}
              onDecline={() => {}}
              pendingAction={pendingId === booking.id ? 'accept' : undefined}
              actionError={errorId === booking.id ? actionError : undefined}
            />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}

// ---- Session (E01-S04) ----

export function SessionView({
  mentorName,
  viewerId,
  now,
  messages,
  status,
  refreshFailed,
  startsAt,
  endsAt,
}: {
  mentorName: string;
  viewerId: 'seeker' | 'mentor';
  now: string;
  messages: SessionMessage[];
  status?: 'ready' | 'loading' | 'error';
  refreshFailed?: boolean;
  startsAt: string;
  endsAt: string;
}) {
  return (
    <Page title={`Session with ${mentorName}`} narrow>
      <SessionThread
        messages={messages}
        viewerId={viewerId}
        startsAt={startsAt}
        endsAt={endsAt}
        now={now}
        status={status}
        refreshFailed={refreshFailed}
        timeZone="UTC"
        onRetry={() => {}}
        onSend={async () => ({ ok: true, status: 201, data: {} })}
      />
    </Page>
  );
}
