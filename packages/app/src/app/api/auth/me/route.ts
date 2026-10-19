import { apiHandler, requireSession, withScope } from "@devmentor/core/server";

export const dynamic = "force-dynamic";

/** GET /api/auth/me - the logged-in user, or 401. */
export const GET = apiHandler(async (request) => {
  const session = await requireSession(request);
  return withScope(({ userService }) => userService.getById(session.userId));
});
