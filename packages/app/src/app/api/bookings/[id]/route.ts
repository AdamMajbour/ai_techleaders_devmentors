import { bookingsCrud } from '../bookings-crud';

export const dynamic = 'force-dynamic';

/** GET /api/bookings/[id] returns a participant-scoped DTO, never a database entity. */
export const { GET } = bookingsCrud;
