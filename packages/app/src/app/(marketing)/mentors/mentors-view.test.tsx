import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MentorProfileDto, Page } from '@devmentor/core';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import { MentorsView } from './mentors-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;

const mentor: MentorProfileDto = {
  id: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  slug: 'ada-lovelace',
  headline: 'Built reliable backend systems',
  bio: 'A practical mentor.',
  technologies: 'node-js typescript',
  publicWorkUrl: 'https://example.com',
  isListed: true,
  activity: 'today',
};

function page(items: MentorProfileDto[] = []): Page<MentorProfileDto> {
  return { items, page: 1, pageSize: 10, total: items.length, pageCount: 1 };
}

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  apiCall.mockReset();
});

describe('MentorsView', () => {
  it('shows the shared loading state while the list is pending', () => {
    apiCall.mockImplementation(() => new Promise<ApiResult<unknown>>(() => undefined));
    render(<MentorsView />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByRole('table', { name: 'Mentor profiles' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no listed mentors are available', async () => {
    apiCall.mockResolvedValue(success(page()));
    render(<MentorsView />);

    expect(await screen.findByText('No listed mentors yet')).toBeInTheDocument();
    expect(screen.getByLabelText('Technology')).toBeInTheDocument();
    expect(screen.queryByText(/rating|stars|score/i)).not.toBeInTheDocument();
  });

  it('shows the shared error state and can retry the list request', async () => {
    apiCall
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        error: { code: 'internal_error', message: 'Mentors could not be loaded.' },
      })
      .mockResolvedValueOnce(success(page()));
    render(<MentorsView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Mentors could not be loaded.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No listed mentors yet')).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('filters through the plain technology select and links list results with their source', async () => {
    apiCall
      .mockResolvedValueOnce(success(page([mentor])))
      .mockResolvedValueOnce(success(page([])));
    render(<MentorsView />);

    const mentorLink = await screen.findByRole('link', { name: 'ada-lovelace' });
    expect(mentorLink).toHaveAttribute('href', '/m/ada-lovelace?source=list');
    expect(screen.getByText('Active today')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Technology'), 'node-js');
    await waitFor(() => {
      expect(apiCall).toHaveBeenLastCalledWith('/api/mentors?page=1&technology=node-js');
    });
    expect(await screen.findByText('No mentors match this technology')).toBeInTheDocument();
  });
});
