'use client';

import { useId, useState } from 'react';

import { MarkdownView } from '../../backend/content/MarkdownView';
import { formatClock, formatDuration } from '../../lib/format';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Textarea } from '../ui/textarea';

export interface ReviewItemData {
  answerId: string;
  /** The seeker's question. The seeker's name is not shown. */
  question: string;
  answerText: string;
  /** The title of the cited note that belongs to the mentor reading this. */
  ownNoteTitle: string;
  /** The other mentors whose notes are cited. */
  otherMentors: string[];
  expiresAt: string;
  canDecide?: boolean;
}

export interface ReviewItemProps {
  item: ReviewItemData;
  /** The server's time at the last poll. The window is decided on the server. */
  now: string;
  onApprove?: (answerId: string) => void;
  onReject?: (answerId: string, reason?: string) => void;
  /** The action that is running. Blocks both buttons so it cannot be sent twice. */
  pendingAction?: 'approve' | 'reject';
  /** Why the last action failed and what to do. */
  actionError?: string;
  /** What this mentor already decided. Replaces the buttons by a sentence. */
  decision?: 'approved' | 'rejected';
  timeZone?: string;
  /** The heading level of the two section titles. One below the heading of the list, so the outline has no gap (WCAG 1.3.1). */
  headingLevel?: 2 | 3 | 4;
}

export const REJECT_REASON_MAX = 500;

// One generated answer waiting for the mentor whose note it cites. The mentor reads the question and the whole
// answer before deciding (D09). One rejection rejects the whole answer, and the hint says so next to the button.
export function ReviewItem({ item, now, onApprove, onReject, pendingAction, actionError, decision, timeZone, headingLevel = 3 }: ReviewItemProps) {
  const Heading = `h${headingLevel}` as const;
  const { answerId, question, answerText, ownNoteTitle, otherMentors, expiresAt } = item;
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const minutesLeft = Math.ceil((new Date(expiresAt).getTime() - new Date(now).getTime()) / 60000);
  const closed = minutesLeft <= 0;
  const busy = pendingAction !== undefined;
  const canDecide = item.canDecide !== false && !decision && !closed;

  return (
    <li className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0">
      <div className="flex flex-col gap-group">
        <Heading className="m-0 text-label font-strong text-headline">Question from a seeker</Heading>
        <p className="m-0 whitespace-pre-line break-words text-body text-foreground">{question}</p>
      </div>
      <div className="flex flex-col gap-group">
        <Heading className="m-0 text-label font-strong text-headline">Generated answer</Heading>
        <div className="border border-border p-panel-compact">
          <MarkdownView source={answerText} linkPolicy="none" />
        </div>
      </div>
      <p className="m-0 text-label text-foreground">
        <span className="font-strong">Your note:</span> {ownNoteTitle}.{' '}
        {otherMentors.length > 0 ? `Also cited: ${otherMentors.join(', ')}.` : 'No other mentor is cited.'}
      </p>
      {decision === 'approved' ? (
        <p className="m-0 text-body text-foreground">You approved this answer. It goes to the seeker when every mentor whose note was used has approved.</p>
      ) : null}
      {decision === 'rejected' ? <p className="m-0 text-body text-foreground">You rejected this answer. The seeker is refunded.</p> : null}
      {!decision && closed ? <p className="m-0 text-body text-foreground">The time to decide has passed. This answer expired and the seeker is refunded.</p> : null}
      {canDecide ? (
        <>
          <p className="m-0 text-label text-muted-foreground">
            Decide by {formatClock(expiresAt, timeZone)} ({formatDuration(minutesLeft)} left).
          </p>
          <Field
            id={reasonId}
            label="Reason (optional)"
            hint="Only the operator reads the reason. The seeker is told only that the answer was not approved. If you reject, the whole answer is rejected and the seeker is refunded."
          >
            <Textarea value={reason} maxLength={REJECT_REASON_MAX} disabled={busy} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-group">
            <Button size="sm" disabled={busy} onClick={() => onApprove?.(answerId)}>
              {pendingAction === 'approve' ? 'Approving…' : 'Approve'}
              <span className="sr-only"> the answer that cites {ownNoteTitle}</span>
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject?.(answerId, reason.trim() || undefined)}>
              {pendingAction === 'reject' ? 'Rejecting…' : 'Reject'}
              <span className="sr-only"> the answer that cites {ownNoteTitle}</span>
            </Button>
          </div>
        </>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
