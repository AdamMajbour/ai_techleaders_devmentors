import { loginSchema, parseOrThrow } from "@devmentor/core";
import {
  apiHandler,
  assertCsrfSafe,
  clientKey,
  getEnv,
  issueSessionCookie,
  jsonResponse,
  loginLimiter,
  readJsonBody,
  withFailureLimit,
  withScope,
} from "@devmentor/core/server";

export const dynamic = "force-dynamic";

/** POST /api/auth/login - checks the credentials and sets the session cookie. */
export const POST = apiHandler(async (request) => {
  assertCsrfSafe(request);
  getEnv(); // a missing JWT_SECRET must fail before any account or password work happens

  const input = parseOrThrow(loginSchema, await readJsonBody(request));
  const user = await withFailureLimit(loginLimiter, clientKey(request, input.email), () =>
    withScope(({ authService }) => authService.login(input)),
  );

  return jsonResponse(user, { headers: { "Set-Cookie": await issueSessionCookie(user.id) } });
});
