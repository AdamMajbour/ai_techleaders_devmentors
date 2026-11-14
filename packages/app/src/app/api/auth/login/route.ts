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
  const destination = await withFailureLimit(loginLimiter, clientKey(request, input.email), () =>
    withScope(async ({ authService, invitationService }) => {
      const user = await authService.login(input);
      const invitation = await invitationService.findUnrevokedByEmail(input.email);
      const defaultDestination = invitation?.role === "mentor" ? "/mentor" : "/seeker";
      return { user, destination: defaultDestination };
    }),
  );

  return jsonResponse(destination, { headers: { "Set-Cookie": await issueSessionCookie(destination.user.id) } });
});
