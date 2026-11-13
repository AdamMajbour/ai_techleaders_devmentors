import { render, screen } from '@testing-library/react';
import { SessionWindow, sessionPhase } from './SessionWindow';

const startsAt = '2026-11-03T13:00:00Z';
const endsAt = '2026-11-03T13:25:00Z';

describe('sessionPhase', () => {
  it('is before, active or ended by the server time', () => {
    expect(sessionPhase(startsAt, endsAt, '2026-11-03T12:59:00Z').phase).toBe('before');
    expect(sessionPhase(startsAt, endsAt, '2026-11-03T13:00:00Z').phase).toBe('active');
    expect(sessionPhase(startsAt, endsAt, '2026-11-03T13:24:59Z').phase).toBe('active');
    expect(sessionPhase(startsAt, endsAt, '2026-11-03T13:25:00Z').phase).toBe('ended');
  });

  it('rounds the minutes left up, so the last seconds still read "1 minute"', () => {
    expect(sessionPhase(startsAt, endsAt, '2026-11-03T13:24:30Z').minutesLeft).toBe(1);
    expect(sessionPhase(startsAt, endsAt, '2026-11-03T13:10:00Z').minutesLeft).toBe(15);
  });
});

describe('SessionWindow', () => {
  it('says when the session starts, before it', () => {
    render(<SessionWindow startsAt={startsAt} endsAt={endsAt} now="2026-11-03T12:50:00Z" timeZone="UTC" />);
    expect(screen.getByText('The session starts at 13:00.')).toBeVisible();
  });

  it('says how many minutes are left and when it ends, during it', () => {
    render(<SessionWindow startsAt={startsAt} endsAt={endsAt} now="2026-11-03T13:13:00Z" timeZone="UTC" />);
    expect(screen.getByText('12 minutes left. The session ends at 13:25.')).toBeVisible();
  });

  it('uses the singular for one minute', () => {
    render(<SessionWindow startsAt={startsAt} endsAt={endsAt} now="2026-11-03T13:24:10Z" timeZone="UTC" />);
    expect(screen.getByText(/^1 minute left\./)).toBeVisible();
  });

  it('says it is read-only after the end', () => {
    render(<SessionWindow startsAt={startsAt} endsAt={endsAt} now="2026-11-03T13:30:00Z" timeZone="UTC" />);
    expect(screen.getByText('The session ended at 13:25. The conversation is read-only.')).toBeVisible();
  });

  it('is plain text, not a live region, so it is not announced every time it updates', () => {
    const { container } = render(<SessionWindow startsAt={startsAt} endsAt={endsAt} now="2026-11-03T13:13:00Z" timeZone="UTC" />);
    expect(container.querySelector('[aria-live], [role="timer"]')).toBeNull();
  });
});
