import { UnauthorizedError, magicLinkConsumeSchema, parseOrThrow } from '@devmentor/core';
import { apiHandler, assertCsrfSafe, clientKey, getEnv, issueSessionCookie, jsonResponse, magicLinkConsumeLimiter, readJsonBody, withFailureLimit, withScope } from '@devmentor/core/server';

export const dynamic = 'force-dynamic';

/** Verifies a reusable account link and signs the account in without consuming the link. */
export const POST = apiHandler(async (request) => {
  assertCsrfSafe(request);
  getEnv();
  const { token } = parseOrThrow(magicLinkConsumeSchema, await readJsonBody(request));
  const user = await withFailureLimit(magicLinkConsumeLimiter, clientKey(request), () =>
    withScope(async ({ magicLinkService, userRepository }) => {
      const email = await magicLinkService.verifyAccountLoginLink(token);
      if (!email) throw new UnauthorizedError('Invalid or expired account link.');
      const account = await userRepository.findByEmail(email);
      if (!account) throw new UnauthorizedError('Invalid or expired account link.');
      return account;
    }),
  );
  return jsonResponse({ signedIn: true }, { headers: { 'Set-Cookie': await issueSessionCookie(user.id) } });
});
