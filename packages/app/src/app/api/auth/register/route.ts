import { ForbiddenError, registerSchema, parseOrThrow } from "@devmentor/core";
import {
  apiHandler,
  assertCsrfSafe,
  clientKey,
  getEnv,
  getAppBaseUrl,
  jsonResponse,
  readJsonBody,
  registerLimiter,
  withScope,
} from "@devmentor/core/server";

export const dynamic = "force-dynamic";

const CREATED = 201;

/** POST /api/auth/register - creates the account and issues a reusable sign-in link. */
export const POST = apiHandler(async (request) => {
  assertCsrfSafe(request);
  const env = getEnv(); // a missing JWT_SECRET must fail before any account or password work happens
  if (!env.PUBLIC_SIGNUP) throw new ForbiddenError("Public sign-up is disabled.");

  const key = clientKey(request);
  registerLimiter.assertAllowed(key);
  registerLimiter.recordFailure(key);

  const input = parseOrThrow(registerSchema, await readJsonBody(request));
  const user = await withScope(({ authService }) => authService.registerForAccountLink(input));
  await withScope(({ magicLinkService }) => magicLinkService.issueAccountLoginLink(user.email, getAppBaseUrl()));

  return jsonResponse({ created: true }, { status: CREATED });
});
