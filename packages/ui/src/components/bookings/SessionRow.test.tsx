import { render, screen } from '@testing-library/react';
import { SessionRow, type SessionRowData } from './SessionRow';

const ADA = { name: 'Ada Kowalska', headline: 'Upgraded ingress-nginx', technologies: ['Kubernetes', 'Go'] };
const accepted: SessionRowData = {
  id: 's1',
  mentor: ADA,
  status: 'accepted',
  priceMinor: 2500,
  currency: 'EUR',
  startsAt: '2026-11-03T13:00:00Z',
};

function renderRow(session: SessionRowData, timeZone = 'Europe/Warsaw') {
  return render(
    <ul>
      <SessionRow session={session} timeZone={timeZone} href="/bookings/s1" />
    </ul>,
  );
}

describe('SessionRow', () => {
  it('shows the mentor as a heading, the status in words and the price', () => {
    renderRow(accepted);
    expect(screen.getByRole('heading', { level: 2, name: 'Ada Kowalska' })).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('25 EUR')).toBeInTheDocument();
  });

  it('shows the date of an accepted session in the time zone of the seeker', () => {
    renderRow(accepted, 'Europe/Warsaw');
    expect(screen.getByText('3 Nov 2026, 14:00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the session with Ada Kowalska, 3 Nov 2026, 14:00' })).toHaveAttribute('href', '/bookings/s1');
  });

  it('shows no date before the mentor accepts, and names the status in the link', () => {
    renderRow({ ...accepted, status: 'paid', startsAt: undefined });
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the session with Ada Kowalska, Waiting for the mentor' })).toBeInTheDocument();
  });

  it('leaves out the technologies line when there are none', () => {
    renderRow({ ...accepted, mentor: { ...ADA, technologies: [] } });
    expect(screen.queryByText(/Kubernetes/)).not.toBeInTheDocument();
  });

  it('shows the technologies joined with a dot', () => {
    renderRow(accepted);
    expect(screen.getByText('Kubernetes · Go')).toBeInTheDocument();
  });

  it('shows the refund line with the status', () => {
    renderRow({ ...accepted, status: 'declined', refund: 'processing', startsAt: undefined });
    expect(screen.getByText('Refund processing')).toBeInTheDocument();
  });
});
