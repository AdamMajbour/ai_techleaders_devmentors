import { mentorsCrud } from './mentors-crud';

export const dynamic = 'force-dynamic';

/** GET /api/mentors?technology=&page= or ?slug= (pilot members only). */
export const { GET, POST } = mentorsCrud;
