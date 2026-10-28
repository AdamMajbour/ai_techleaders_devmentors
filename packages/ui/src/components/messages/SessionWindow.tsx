import { formatClock } from '../../lib/format';

export type SessionPhase = 'before' | 'active' | 'ended';

export function sessionPhase(startsAt: string, endsAt: string, now: string): { phase: SessionPhase; minutesLeft: number } {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const current = new Date(now).getTime();
  if (current < start) return { phase: 'before', minutesLeft: Math.ceil((end - start) / 60000) };
  if (current >= end) return { phase: 'ended', minutesLeft: 0 };
  return { phase: 'active', minutesLeft: Math.ceil((end - current) / 60000) };
}

export interface SessionWindowProps {
  startsAt: string;
  endsAt: string;
  /** The server's time, not the browser's (Clock skew: the window is decided on the server). */
  now: string;
  timeZone?: string;
}

// Says where the session stands, in words. It is plain text, not a ticking countdown: the caller passes the
// server time it last polled, so nothing is announced every second.
export function SessionWindow({ startsAt, endsAt, now, timeZone }: SessionWindowProps) {
  const { phase, minutesLeft } = sessionPhase(startsAt, endsAt, now);
  const text =
    phase === 'before'
      ? `The session starts at ${formatClock(startsAt, timeZone)}.`
      : phase === 'active'
        ? `${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'} left. The session ends at ${formatClock(endsAt, timeZone)}.`
        : `The session ended at ${formatClock(endsAt, timeZone)}. The conversation is read-only.`;
  return (
    <p data-phase={phase} className="m-0 text-body text-foreground">
      {text}
    </p>
  );
}
