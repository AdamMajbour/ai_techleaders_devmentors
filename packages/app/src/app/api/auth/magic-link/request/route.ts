import { magicLinkRequestSchema, parseOrThrow } from "@devmentor/core";
import {
  apiHandler,
  assertCsrfSafe,
  clientKey,
  jsonResponse,
  magicLinkRequestLimiter,
  readJsonBody,
  withScope,
} from "@devmentor/core/server";

export const dynamic = "force-dynamic";

/** POST /api/auth/magic-link/request - sends a link only to an unrevoked invite. */
export const POST = apiHandler(async (request) => {
  assertCsrfSafe(request);
  const input = parseOrThrow(magicLinkRequestSchema, await readJsonBody(request));
  const key = clientKey(request, input.email);
  magicLinkRequestLimiter.assertAllowed(key);
  magicLinkRequestLimiter.recordFailure(key);

  await withScope(({ magicLinkService }) =>
    magicLinkService.request(input.email, new URL(request.url).origin),
  );

  return jsonResponse({ sent: true });
});
