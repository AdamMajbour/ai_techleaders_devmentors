import { apiHandler, assertCsrfSafe, clearSessionCookie, jsonResponse } from "@devmentor/core/server";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout - clears the session cookie. */
export const POST = apiHandler(async (request) => {
  assertCsrfSafe(request);
  return jsonResponse({ loggedOut: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
});
