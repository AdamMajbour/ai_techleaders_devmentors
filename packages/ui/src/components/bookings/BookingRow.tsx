import { formatPrice } from '../../lib/format';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { TextLink } from '../ui/text-link';
import { BookingStatus, type BookingStatusValue, type BookingViewer, type RefundState } from './BookingStatus';

export interface BookingRowData {
  id: string;
  /** The seeker's question. The mentor reads it here before accepting (R05). The server leaves it out for the
   *  mentor once the booking is declined or expired (booking spec, Grill 8): then the row says so. */
  question?: string;
  /** The other person: the mentor for a seeker, the seeker's display name for a mentor. */
  counterpartName: string;
  status: BookingStatusValue;
  priceMinor: number;
  currency: string;
  refund?: RefundState;
}

export interface BookingRowProps {
  booking: BookingRowData;
  viewer: BookingViewer;
  /** Where the booking opens. */
  href?: string;
  /** Shown to a mentor for a paid booking. */
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  /** The action that is running. Blocks both buttons so it cannot be sent twice. */
  pendingAction?: 'accept' | 'decline';
  /** Why the last action failed and what to do. */
  actionError?: string;
}

// One booking in a list. Render it inside a <ul>. Rows are divided by a hairline, not boxed in cards (R01.1).
// The mentor sees the whole question next to Accept and Decline (R05); a long one is cut at three lines and
// opens in full through the link.
export function BookingRow({ booking, viewer, href, onAccept, onDecline, pendingAction, actionError }: BookingRowProps) {
  const { id, question, counterpartName, status, priceMinor, currency, refund } = booking;
  const canDecide = viewer === 'mentor' && status === 'paid' && (onAccept || onDecline);
  const busy = pendingAction !== undefined;

  return (
    <li className="flex flex-col gap-group border-b border-border py-panel-compact last:border-b-0">
      <div className="flex flex-wrap items-center gap-group">
        <p className="m-0 text-body text-headline">
          <span className="text-meta text-muted-foreground">{viewer === 'seeker' ? 'Mentor' : 'Seeker'} </span>
          <span className="font-strong">{counterpartName}</span>
        </p>
        <BookingStatus status={status} viewer={viewer} refund={refund} />
        <span className="ml-auto text-body tabular-nums">{formatPrice(priceMinor, currency)}</span>
      </div>
      {question !== undefined ? (
        <p className="m-0 line-clamp-3 whitespace-pre-line break-words text-body text-foreground">{question}</p>
      ) : (
        <p className="m-0 text-body text-muted-foreground">You can no longer see this question.</p>
      )}
      {href ? (
        <TextLink href={href} className="w-fit text-label">
          Open<span className="sr-only"> the booking with {counterpartName}</span>
        </TextLink>
      ) : null}
      {canDecide ? (
        <div className="flex flex-wrap items-center gap-group">
          {onAccept ? (
            <Button size="sm" disabled={busy} onClick={() => onAccept(id)}>
              {pendingAction === 'accept' ? 'Accepting…' : 'Accept'}
              <span className="sr-only"> the question from {counterpartName}</span>
            </Button>
          ) : null}
          {onDecline ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecline(id)}>
              {pendingAction === 'decline' ? 'Declining…' : 'Decline'}
              <span className="sr-only"> the question from {counterpartName}</span>
            </Button>
          ) : null}
        </div>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}
