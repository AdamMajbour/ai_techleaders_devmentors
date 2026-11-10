import { parseOrThrow, userProfileUpdateSchema } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, readJsonBody, requireSession, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me - the logged-in user, or 401. */
export const GET = apiHandler(async (request) => {
  const session = await requireSession(request);
  return withScope(({ userService }) => userService.getById(session.userId));
});

/** PUT /api/auth/me - updates only the signed-in user's display name. */
export const PUT = apiHandler(async (request) => {
  assertCsrfSafe(request);
  const session = await requireSession(request);
  const changes = parseOrThrow(userProfileUpdateSchema, await readJsonBody(request));
  return withScope(({ userService }) => userService.updateOwnProfile(session, changes));
});
