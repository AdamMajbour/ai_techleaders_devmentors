export type BookingSource = 'list' | 'link';

export type BookingAttribution = {
  source: BookingSource;
  mentorSlug: string;
  landedAt: string;
};

export const BOOKING_ATTRIBUTION_STORAGE_KEY = 'devmentor.booking-attribution.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isBookingSource(value: unknown): value is BookingSource {
  return value === 'list' || value === 'link';
}

function isAttribution(value: unknown, mentorSlug: string, now: Date): value is BookingAttribution {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (
    record.mentorSlug !== mentorSlug ||
    !isBookingSource(record.source) ||
    typeof record.landedAt !== 'string'
  ) {
    return false;
  }

  const parsed = Date.parse(record.landedAt);
  return (
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString() === record.landedAt &&
    parsed <= now.getTime() + 5 * 60 * 1000
  );
}

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Keeps one validated attribution record stable across refreshes and later flow steps in this tab. */
export function captureBookingAttribution(
  mentorSlug: string,
  source: BookingSource,
  storage?: StorageLike,
  now: () => Date = () => new Date(),
): BookingAttribution | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mentorSlug) || mentorSlug.length > 100) return null;

  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    const currentTime = now();
    const existing = target.getItem(BOOKING_ATTRIBUTION_STORAGE_KEY);
    if (existing) {
      try {
        const parsed: unknown = JSON.parse(existing);
        if (
          isAttribution(parsed, mentorSlug, currentTime) &&
          parsed.source === source
        ) {
          return parsed;
        }
      } catch {
        // Replace malformed session data with a fresh, validated record.
      }
    }

    const attribution: BookingAttribution = {
      source,
      mentorSlug,
      landedAt: currentTime.toISOString(),
    };
    target.setItem(BOOKING_ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return null;
  }
}
