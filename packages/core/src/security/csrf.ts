import { ForbiddenError } from '../http/errors';

/** `apiCall` sends this on every request; a plain HTML form post or a cross-site request does not carry it. */
export const CLIENT_HEADER_NAME = 'x-requested-with';
export const CLIENT_HEADER_VALUE = 'devmentor';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The host the browser addressed: what a proxy forwarded, else the Host header, else the URL's own host. */
function requestHost(request: Request): string {
  return request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || new URL(request.url).host;
}

/**
 * CSRF defense for cookie auth, in addition to SameSite: every state-changing request must carry
 * the client header, and if the browser sent an Origin it must be the host that was addressed
 * (not `request.url`, which can name an internal hostname behind a proxy).
 */
export function assertCsrfSafe(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return;

  if (request.headers.get(CLIENT_HEADER_NAME) !== CLIENT_HEADER_VALUE) {
    throw new ForbiddenError('Missing client header.');
  }

  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== requestHost(request)) {
    throw new ForbiddenError('Cross-origin request rejected.');
  }
}
