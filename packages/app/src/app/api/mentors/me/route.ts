import { apiHandler, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

/** GET the signed-in accepted mentor's own profile, or null before it has been created. */
export const GET = apiHandler(async (request: Request) => {
  const session = await requireSession(request);
  return withScope((cradle) => cradle.mentorService.getOwnProfile(session));
});
