import { mentorsCrud } from '../mentors-crud';

export const dynamic = 'force-dynamic';

/** GET a listed mentor or the owner's unlisted profile; PUT is owner-only. */
export const { GET, PUT } = mentorsCrud;
