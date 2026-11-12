'use client';

// Example compositions of the E02 screens (notes and the vault), built only from the design system. Like the E01
// views they document the state map of each screen and are not exported from the package.
import { useState } from 'react';

import { EmptyState } from '../backend/feedback/EmptyState';
import { ErrorMessage } from '../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../backend/feedback/LoadingMessage';
import type { ApiResult } from '../backend/api/types';
import { QuestionForm } from '../components/bookings/QuestionForm';
import { NoteEditor, noteStatusLabel, type NoteStatus } from '../components/notes/NoteEditor';
import { PublishNoticePanel } from '../components/notes/PublishNoticePanel';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/ui/status-badge';
import { TextLink } from '../components/ui/text-link';
import { CreditsPanel, type CreditsPanelProps } from '../components/vault/CreditsPanel';
import { ReviewItem, type ReviewItemData } from '../components/vault/ReviewItem';
import { VaultAnswerView, type VaultAnswerViewProps } from '../components/vault/VaultAnswerView';
import { NOTE_BODY, NOTICE_DRAFT_LABEL, NOTICE_ITEMS, NOTICE_VERSION } from '../../.storybook/blocks/sampleData';
import { Page } from '../backend/layout/Page';
import { ApprovalQueue } from '../backend/queues/ApprovalQueue';
import { TestModeBanner } from './e01-views';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: {} };

// ---- Notes list with the credits panel (E02-S01, E02-S03) ----

export type ListState = 'loading' | 'ready' | 'empty' | 'error';

export function NotesListView({
  state,
  notes,
  credits,
}: {
  state: ListState;
  notes: { id: string; title: string; status: NoteStatus }[];
  credits: CreditsPanelProps;
}) {
  return (
    <Page title="Your notes">
      <div>
        <Button asChild>
          <a href="#new-note">New note</a>
        </Button>
      </div>
      {state === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-between-groups">
          <LoadingMessage message="Loading your notes…" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : null}
      {state === 'error' ? <ErrorMessage message="Your notes could not be loaded. Check your connection and try again." onRetry={() => {}} /> : null}
      {state === 'empty' ? (
        <EmptyState title="No notes yet" description="Write down what you explain again and again. A note feeds AI answers only after you publish it." />
      ) : null}
      {state === 'ready' ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-wrap items-center gap-group border-b border-border py-panel-compact last:border-b-0">
              <TextLink href={`#${note.id}`} className="text-body font-strong">
                {note.title}
              </TextLink>
              <StatusBadge tone={noteStatusLabel(note.status).tone}>{noteStatusLabel(note.status).text}</StatusBadge>
            </li>
          ))}
        </ul>
      ) : null}
      <CreditsPanel {...credits} />
    </Page>
  );
}

// ---- One note: editor, publish panel, take down (E02-S01) ----

export type NoteViewStatus = 'new' | NoteStatus;

export function NoteDetailView({
  status,
  publishBlockedReason,
  onPublish,
}: {
  status: NoteViewStatus;
  publishBlockedReason?: string;
  onPublish?: (input: { consent: true; noticeVersion: string }) => Promise<ApiResult<unknown>>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [takenDown, setTakenDown] = useState(false);
  return (
    <Page title={status === 'new' ? 'New note' : 'Ingress upgrades on bare metal'} narrow>
      <NoteEditor
        status={status === 'new' ? undefined : status}
        initialValues={status === 'new' ? undefined : { title: 'Ingress upgrades on bare metal', body: NOTE_BODY }}
        onSave={async () => ok}
      />
      {status === 'new' ? <p className="m-0 text-body text-muted-foreground">You can publish the note after you save the draft.</p> : null}
      {status === 'draft' || status === 'taken_down' ? (
        <>
          <p className="m-0 text-label text-muted-foreground">{NOTICE_DRAFT_LABEL}</p>
          <PublishNoticePanel
            noticeItems={NOTICE_ITEMS}
            noticeVersion={NOTICE_VERSION}
            blockedReason={publishBlockedReason}
            onPublish={onPublish ?? (async () => ok)}
          />
        </>
      ) : null}
      {status === 'published' ? (
        <section aria-label="Take the note down" className="flex flex-col items-start gap-group">
          <p className="m-0 text-body text-foreground">
            This note feeds AI answers. Taking it down rejects answers that are waiting for review. Answers that were already released stay.
          </p>
          {takenDown ? (
            <p role="status" className="m-0 text-body">
              The note was taken down.
            </p>
          ) : (
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              Take down note
            </Button>
          )}
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={'Take down "Ingress upgrades on bare metal"?'}
            description="Answers waiting for review that cite it are rejected and refunded. Answers already released stay. You can publish the note again after you accept the notice again."
            confirmLabel="Take down note"
            tone="destructive"
            onConfirm={() => {
              setTakenDown(true);
              setConfirming(false);
            }}
          />
        </section>
      ) : null}
    </Page>
  );
}

// ---- Answers to review (E02-S02) ----

export function PreviewsView({
  state,
  items,
  now,
  decisions = {},
  pendingId,
  errorId,
  actionError,
  onRetry = () => {},
}: {
  state: ListState;
  items: ReviewItemData[];
  now: string;
  decisions?: Record<string, 'approved' | 'rejected'>;
  pendingId?: string;
  errorId?: string;
  actionError?: string;
  onRetry?: () => void;
}) {
  return (
    <Page title="Answers to review">
      <p className="m-0 max-w-session text-body text-foreground">
        These answers were written by AI from notes that include yours. Read each one before the seeker does.
      </p>
      <ApprovalQueue
        state={state}
        items={items}
        emptyTitle="Nothing to review"
        emptyDescription="When an answer cites one of your notes, it appears here and we email you."
        errorMessage="Answers to review could not be loaded. Check your connection and try again."
        loadingMessage="Loading answers to review…"
        onRetry={onRetry}
        renderItem={(item) => (
            <ReviewItem
              key={item.answerId}
              item={item}
              now={now}
              timeZone="UTC"
              headingLevel={2}
              decision={decisions[item.answerId]}
              pendingAction={pendingId === item.answerId ? 'approve' : undefined}
              actionError={errorId === item.answerId ? actionError : undefined}
              onApprove={() => {}}
              onReject={() => {}}
            />
        )}
      />
    </Page>
  );
}

// ---- Ask the vault (E02-S03) ----

export function VaultAskView({
  corpus,
  onSubmit,
}: {
  corpus: 'has_notes' | 'no_notes';
  onSubmit: (input: { question: string; acceptedTerms: true }) => Promise<ApiResult<unknown>>;
}) {
  return (
    <Page title="Ask the vault" narrow>
      <TestModeBanner />
      <p className="m-0 text-body text-foreground">
        An AI writes your answer from notes that mentors chose to publish. The mentors whose notes are used read the answer before you do.
      </p>
      {corpus === 'no_notes' ? (
        <EmptyState title="No notes yet" description="No mentor has published a note yet. Check back soon." />
      ) : (
        <QuestionForm
          priceMinor={1000}
          currency="EUR"
          priceDescription="for one answer written by AI from mentors' notes"
          refundRule="You pay now. If the mentors do not approve the answer or it cannot be written, you are refunded."
          fieldHint="Mentors whose notes are cited read your question before you get the answer. Do not paste secrets."
          termsHref="#terms"
          maxLength={2000}
          onSubmit={onSubmit}
        />
      )}
    </Page>
  );
}

export function VaultAnswerPage({ page = 'ready', ...answer }: VaultAnswerViewProps & { page?: 'ready' | 'loading' | 'loadFailed' | 'notFound' }) {
  return (
    <Page title="Your vault answer" narrow>
      {page === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-between-groups">
          <LoadingMessage message="Loading your answer…" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : null}
      {page === 'loadFailed' ? <ErrorMessage message="Your answer could not be loaded. Check your connection and try again." onRetry={() => {}} /> : null}
      {page === 'notFound' ? (
        <div className="flex flex-col items-start gap-group">
          <ErrorMessage message="This answer does not exist or you do not have access to it." />
          <TextLink href="#vault">Back to the vault</TextLink>
        </div>
      ) : null}
      {page === 'ready' ? <VaultAnswerView {...answer} /> : null}
    </Page>
  );
}
