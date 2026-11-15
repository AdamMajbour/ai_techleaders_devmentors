/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { InvitationBatch, type InvitationBatchSection } from './InvitationBatch';

const section: InvitationBatchSection = {
  title: 'Batch 1',
  state: 'Open',
  sent: 1,
  accepted: 0,
  published: 0,
  invitations: [{
    id: 'one', email: 'ada@example.com', displayName: null, stackTags: [],
    status: 'Waiting for acceptance', acceptedAt: null, publishDueAt: null,
  }],
};

describe('InvitationBatch', () => {
  it('shows explicit batch counts, column labels and empty tag text', () => {
    render(<InvitationBatch section={section} />);
    expect(screen.getByText('1 of 20 sent, 0 accepted, 0 published within two weeks')).toBeInTheDocument();
    expect(screen.getByText('Mentor')).toBeInTheDocument();
    expect(screen.getAllByText('No stack tags recorded').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting for acceptance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not accepted').length).toBeGreaterThan(0);
  });

  it('does not show internal status codes or invalid date text', () => {
    render(<InvitationBatch section={{ ...section, invitations: [{ ...section.invitations[0], acceptedAt: 'broken', publishDueAt: 'broken' }] }} />);
    expect(screen.queryByText(/Invalid Date|undefined|null|NaN|overdue|invited/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Date not available').length).toBeGreaterThan(0);
  });
});
