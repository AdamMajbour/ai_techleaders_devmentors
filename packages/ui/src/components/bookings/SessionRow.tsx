import { formatClock, formatDate, formatPrice } from '../../lib/format';
import { TextLink } from '../ui/text-link';
import { BookingStatus, bookingStatusLabel, type BookingStatusValue, type RefundState } from './BookingStatus';

export interface SessionMentor {
  name: string;
  /** What the mentor has done, in concrete words. The specialization shown in a row (decided 2026-10-28). */
  headline: string;
  technologies: string[];
}

export interface SessionRowData {
  id: string;
  mentor: SessionMentor;
  status: BookingStatusValue;
  refund?: RefundState;
  /** The price of this booking, what was charged, not the mentor's current price. */
  priceMinor: number;
  currency: string;
  /** Set by the server once the mentor has accepted. Only an accepted session shows a date. */
  startsAt?: string;
}

export interface SessionRowProps {
  session: SessionRowData;
  /** The seeker's time zone, an IANA name ("Europe/Warsaw"). The date and the time are shown in it. */
  timeZone: string;
  /** Where the session opens. */
  href: string;
  /** The heading level of the mentor's name, one below the page heading. */
  headingLevel?: 2 | 3 | 4;
}

// One session in the seeker's list "My sessions". Render it inside a <ul>. Rows are divided by a hairline, not boxed (R01.1).
// Left: the mentor and, for an accepted session, its date. Right: the status, the price and the link, in that order; from md up
// the right column sits beside the left one, below it on a phone. The mentor's name is plain text, the link is "Open".
export function SessionRow({ session, timeZone, href, headingLevel = 2 }: SessionRowProps) {
  const Heading = `h${headingLevel}` as const;
  const { mentor, status, refund, priceMinor, currency, startsAt } = session;
  const when = status === 'accepted' && startsAt ? `${formatDate(startsAt, timeZone)}, ${formatClock(startsAt, timeZone)}` : null;
  const statusText = bookingStatusLabel(status, 'seeker').text;

  return (
    <li className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-group break-words">
        <Heading className="m-0 text-body font-strong text-headline">{mentor.name}</Heading>
        <p className="m-0 text-body text-foreground">{mentor.headline}</p>
        {mentor.technologies.length > 0 ? <p className="m-0 text-label text-muted-foreground">{mentor.technologies.join(' · ')}</p> : null}
        {when ? <p className="m-0 text-label tabular-nums text-foreground">{when}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-group md:items-end">
        <BookingStatus status={status} viewer="seeker" refund={refund} />
        <span className="text-body font-strong tabular-nums text-headline">{formatPrice(priceMinor, currency)}</span>
        <TextLink href={href} className="w-fit text-label">
          Open<span className="sr-only"> the session with {mentor.name}, {when ?? statusText}</span>
        </TextLink>
      </div>
    </li>
  );
}
