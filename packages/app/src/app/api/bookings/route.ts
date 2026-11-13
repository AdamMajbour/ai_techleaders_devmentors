import { bookingsCrud } from './bookings-crud';

export const dynamic = 'force-dynamic';

/** GET /api/bookings?role=seeker|mentor&page= and POST /api/bookings. */
export const { GET, POST } = bookingsCrud;
