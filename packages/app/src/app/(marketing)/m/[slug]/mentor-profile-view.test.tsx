import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { MentorProfileDto } from '@devmentor/core';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import {
  BOOKING_ATTRIBUTION_STORAGE_KEY,
  captureBookingAttribution,
} from '@/lib/booking-attribution';
import { MentorProfileView } from './mentor-profile-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;

const unlistedProfile: MentorProfileDto = {
  id: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  slug: 'ada-lovelace',
  headline: 'Built reliable backend systems',
  bio: 'A practical mentor.',
  technologies: 'node-js typescript',
  publicWorkUrl: 'https://example.com/work',
  isListed: false,
  activity: 'within_hour',
};

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  apiCall.mockReset();
  window.sessionStorage.clear();
});

describe('MentorProfileView', () => {
  it('shows an unlisted profile with a bucketed activity label and no precise timestamp', async () => {
    apiCall.mockResolvedValue(success(unlistedProfile));
    const { container } = render(<MentorProfileView slug="ada-lovelace" source="link" />);

    expect(await screen.findByRole('heading', { name: 'ada-lovelace' })).toBeInTheDocument();
    expect(screen.getByText('Active within the last hour')).toBeInTheDocument();
    expect(
      screen.getByText('Activity is shown in broad buckets, not precise timestamps, and is not a promise of reply time.'),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(apiCall).toHaveBeenCalledWith('/api/mentors?slug=ada-lovelace');
  });

  it('captures and reuses safe list attribution in session storage', async () => {
    apiCall.mockResolvedValue(success(unlistedProfile));
    render(<MentorProfileView slug="ada-lovelace" source="list" />);

    await screen.findByRole('heading', { name: 'ada-lovelace' });
    const stored = JSON.parse(window.sessionStorage.getItem(BOOKING_ATTRIBUTION_STORAGE_KEY) ?? 'null');
    expect(stored).toEqual({
      source: 'list',
      mentorSlug: 'ada-lovelace',
      landedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  });

  it('keeps a valid landing time stable and replaces malformed storage safely', () => {
    const storage = window.sessionStorage;
    const first = captureBookingAttribution(
      'ada-lovelace',
      'list',
      storage,
      () => new Date('2026-11-05T12:00:00.000Z'),
    );
    const repeated = captureBookingAttribution(
      'ada-lovelace',
      'list',
      storage,
      () => new Date('2026-11-05T13:00:00.000Z'),
    );

    expect(repeated).toEqual(first);
    expect(captureBookingAttribution('ada-lovelace', 'link', storage, () => new Date('2026-11-05T14:00:00.000Z')))
      .toEqual({
        source: 'link',
        mentorSlug: 'ada-lovelace',
        landedAt: '2026-11-05T14:00:00.000Z',
      });

    storage.setItem(BOOKING_ATTRIBUTION_STORAGE_KEY, '{bad-json');
    expect(captureBookingAttribution('grace-hopper', 'link', storage, () => new Date('2026-11-05T15:00:00.000Z')))
      .toEqual({
        source: 'link',
        mentorSlug: 'grace-hopper',
        landedAt: '2026-11-05T15:00:00.000Z',
      });
  });
});
