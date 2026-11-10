import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import { MentorAvailabilityView } from './availability-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;
const slot = { id: 'slot-1', startsAt: '2026-11-12T13:00:00.000Z', endsAt: '2026-11-12T13:25:00.000Z' };

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => apiCall.mockReset());

describe('MentorAvailabilityView', () => {
  it('publishes a slot and lists it for seekers', async () => {
    apiCall
      .mockResolvedValueOnce(success([]))
      .mockResolvedValueOnce(success(slot))
      .mockResolvedValueOnce(success([slot]));
    const user = userEvent.setup();
    render(<MentorAvailabilityView />);

    await screen.findByRole('heading', { name: 'Session availability' });
    await user.clear(screen.getByLabelText(/Session start/));
    await user.type(screen.getByLabelText(/Session start/), '2026-11-12T13:00');
    await user.click(screen.getByRole('button', { name: 'Publish available time' }));

    await screen.findByText('The session time is now available to seekers.');
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/api/mentors/me/availability', {
      method: 'POST', json: { startsAt: new Date('2026-11-12T13:00').toISOString() },
    }));
    expect(await screen.findByRole('heading', { name: 'Open times' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveTextContent(/12/);
  });

  it('lets a mentor remove an open slot', async () => {
    apiCall
      .mockResolvedValueOnce(success([slot]))
      .mockResolvedValueOnce(success({ cancelled: true }))
      .mockResolvedValueOnce(success([]));
    const user = userEvent.setup();
    render(<MentorAvailabilityView />);

    await user.click(await screen.findByRole('button', { name: 'Remove' }));

    expect(apiCall).toHaveBeenNthCalledWith(2, '/api/mentors/me/availability/slot-1', { method: 'DELETE' });
  });
});
