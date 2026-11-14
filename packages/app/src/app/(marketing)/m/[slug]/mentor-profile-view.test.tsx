import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
let originalLocation: Location;

const unlistedProfile: MentorProfileDto = {
  id: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  slug: 'ada-lovelace',
  headline: 'Built reliable backend systems',
  bio: 'A practical mentor.',
  technologies: 'node-js typescript',
  publicWorkUrl: 'https://example.com/work',
  githubUrl: null,
  isListed: false,
  activity: 'within_hour',
};

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  originalLocation = window.location;
  apiCall.mockReset();
  apiCall.mockImplementation(async (path) => (
    typeof path === 'string' && path.includes('/availability')
      ? success([])
      : typeof path === 'string' && path.includes('/api/terms/current')
        ? success({ id: '00000000-0000-4000-8000-000000000001', version: 'pilot-1', sha256: 'a'.repeat(64) })
      : success(unlistedProfile)
  ) as never);
  window.sessionStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
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

  it('shows the 25 PLN price before the question and submits the preserved attribution', async () => {
      const user = userEvent.setup();
      const assign = jest.fn();
      Object.defineProperty(window, 'location', { configurable: true, value: { assign } as unknown as Location });
      const landing = '2026-11-05T12:00:00.000Z';
      window.sessionStorage.setItem(BOOKING_ATTRIBUTION_STORAGE_KEY, JSON.stringify({
        source: 'list',
        mentorSlug: 'ada-lovelace',
        landedAt: landing,
      }));
      const slot = { id: '3c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11', startsAt: '2026-11-06T13:00:00.000Z', endsAt: '2026-11-06T13:25:00.000Z' };
      apiCall
        .mockImplementation(async (path) => (
          typeof path === 'string' && path.includes('/availability')
            ? success([slot])
            : typeof path === 'string' && path.includes('/api/terms/current')
              ? success({ id: '00000000-0000-4000-8000-000000000001', version: 'pilot-1', sha256: 'a'.repeat(64) })
            : typeof path === 'string' && path === '/api/bookings'
              ? success({ checkoutUrl: 'https://checkout.example/session' })
              : success(unlistedProfile)
        ) as never);
      render(<MentorProfileView slug="ada-lovelace" source="list" />);

      await screen.findByRole('heading', { name: 'ada-lovelace' });
      expect(screen.getByRole('region', { name: 'Price' })).toHaveTextContent('25 PLN');
      expect(screen.queryByRole('textbox', { name: /Your question/ })).not.toBeInTheDocument();
      await user.selectOptions(await screen.findByRole('combobox', { name: 'Available session time' }), slot.id);
      const price = screen.getByRole('region', { name: 'Price' });
      const question = screen.getByRole('textbox', { name: /Your question/ });
      expect(price.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(price).toHaveTextContent('25 PLN');
      expect(question).toHaveAttribute('maxLength', '4000');

      await user.type(question, 'How do I fix this issue in the service?');
      await user.click(screen.getByRole('checkbox', { name: /pilot terms/i }));
      await user.click(screen.getByRole('button', { name: /Pay .* and send/ }));

      await waitFor(() => expect(apiCall).toHaveBeenLastCalledWith('/api/bookings', {
        method: 'POST',
        json: {
          mentorId: unlistedProfile.id,
          availabilitySlotId: slot.id,
          durationMinutes: 25,
          question: 'How do I fix this issue in the service?',
          acceptedTerms: true,
          termsVersionId: '00000000-0000-4000-8000-000000000001',
          termsSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          source: 'list',
          landedAt: landing,
        },
      }));
      expect(assign).toHaveBeenCalledWith('https://checkout.example/session');
  });

  it('keeps checkout unavailable when no reviewed seeker terms are published', async () => {
    const user = userEvent.setup();
    const slot = { id: '3c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11', startsAt: '2026-11-16T13:00:00.000Z', endsAt: '2026-11-16T13:25:00.000Z' };
    apiCall.mockImplementation(async (path) => (
      typeof path === 'string' && path.includes('/availability')
        ? success([slot])
        : typeof path === 'string' && path.includes('/api/terms/current')
          ? success(null)
          : success(unlistedProfile)
    ) as never);
    render(<MentorProfileView slug="ada-lovelace" source="link" />);

    await screen.findByRole('heading', { name: 'ada-lovelace' });
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Available session time' }), slot.id);

    expect(await screen.findByRole('status')).toHaveTextContent('Checkout is unavailable until current reviewed pilot terms are published.');
    expect(screen.queryByRole('textbox', { name: /Your question/ })).not.toBeInTheDocument();
    expect(apiCall).not.toHaveBeenCalledWith('/api/bookings', expect.anything());
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
