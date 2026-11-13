import { UnauthorizedError, magicLinkConsumeSchema, parseOrThrow } from "@devmentor/core";
import {
  apiHandler,
  assertCsrfSafe,
  clientKey,
  getEnv,
  INVALID_MAGIC_LINK_MESSAGE,
  issueSessionCookie,
  jsonResponse,
  magicLinkConsumeLimiter,
  readJsonBody,
  withFailureLimit,
  withScope,
} from "@devmentor/core/server";

export const dynamic = "force-dynamic";

/** POST /api/auth/magic-link/consume - consumes a single-use link and sets the session cookie. */
export const POST = apiHandler(async (request) => {
  assertCsrfSafe(request);
  getEnv(); // Fail before consuming the token if session signing is not configured.
  const input = parseOrThrow(magicLinkConsumeSchema, await readJsonBody(request));

  const user = await withFailureLimit(magicLinkConsumeLimiter, clientKey(request), () =>
    withScope(async ({ magicLinkService, authService }) => {
      const email = await magicLinkService.consume(input.token);
      if (!email) throw new UnauthorizedError(INVALID_MAGIC_LINK_MESSAGE);
      return authService.signInWithMagicLink(email);
    }),
  );

  return jsonResponse({ user }, { headers: { "Set-Cookie": await issueSessionCookie(user.id) } });
});
