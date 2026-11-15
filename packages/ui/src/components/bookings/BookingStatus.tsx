import { cn } from '../../lib/utils';
import { StatusBadge } from '../ui/status-badge';

export type BookingStatusValue = 'pending_payment' | 'payment_failed' | 'paid' | 'accepted' | 'declined' | 'expired';
export type BookingViewer = 'seeker' | 'mentor';
/** `pending_approval`: waiting for the operator. `processing`: approved, the money is on its way back. */
export type RefundState = 'none' | 'pending_approval' | 'processing' | 'refunded';

type Tone = 'neutral' | 'active' | 'danger';

// The words are written from the reader's point of view: a paid booking is "Waiting for the mentor" to the seeker
// and "Awaiting your decision" to the mentor. The tone assignment is a proposal; the success and warning tones
// are not defined yet (conflict K3).
const LABELS: Record<BookingViewer, Record<BookingStatusValue, { tone: Tone; text: string }>> = {
  seeker: {
    pending_payment: { tone: 'neutral', text: 'Awaiting payment' },
    payment_failed: { tone: 'danger', text: 'Payment failed' },
    paid: { tone: 'neutral', text: 'Waiting for the mentor' },
    accepted: { tone: 'active', text: 'Accepted' },
    declined: { tone: 'danger', text: 'Declined' },
    expired: { tone: 'danger', text: 'Not answered in time' },
  },
  mentor: {
    pending_payment: { tone: 'neutral', text: 'Awaiting payment' },
    payment_failed: { tone: 'neutral', text: 'Payment failed' },
    paid: { tone: 'active', text: 'Awaiting your decision' },
    accepted: { tone: 'active', text: 'Accepted' },
    declined: { tone: 'neutral', text: 'Declined' },
    expired: { tone: 'neutral', text: 'Not answered in time' },
  },
};

const REFUND_TEXT: Record<Exclude<RefundState, 'none'>, string> = {
  pending_approval: 'Refund pending approval',
  processing: 'Refund processing',
  refunded: 'Refunded',
};

export function bookingStatusLabel(status: BookingStatusValue, viewer: BookingViewer) {
  return LABELS[viewer][status];
}

/** Where the money stands after a decline, an expiry or a no-show. Plain text, never colour alone. */
export function RefundStatusLine({ refund, className }: { refund: RefundState; className?: string }) {
  if (refund === 'none') return null;
  return <span className={cn('text-meta text-muted-foreground', className)}>{REFUND_TEXT[refund]}</span>;
}

export function BookingStatus({
  status,
  viewer,
  refund = 'none',
  className,
}: {
  status: BookingStatusValue;
  viewer: BookingViewer;
  refund?: RefundState;
  className?: string;
}) {
  const { tone, text } = bookingStatusLabel(status, viewer);
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-group', className)}>
      <StatusBadge tone={tone}>{text}</StatusBadge>
      <RefundStatusLine refund={refund} />
    </span>
  );
}
