import { getEnv, getOperatorUserIds } from '../config/env';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
  signSession,
  verifySession,
  type Session,
} from '../security/session';
import { ForbiddenError, NotFoundError, UnauthorizedError } from './errors';

export type PilotMemberResolver = (session: Session, request: Request) => boolean | Promise<boolean>;

/**
 * The secret is read only when a cookie is present, so public reads keep working on a server
 * without JWT_SECRET; a request that does carry a cookie then fails closed (500), never open.
 */
async function sessionFromRequest(request: Request, secret?: string): Promise<Session | null> {
  const token = readSessionCookie(request);
  return token ? verifySession(token, secret ?? getEnv().JWT_SECRET) : null;
}

/** Call first in every route that is not public, before touching a service. */
export async function requireSession(request: Request, secret?: string): Promise<Session> {
  const session = await sessionFromRequest(request, secret);
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Like `requireSession`, but answers null for a visitor who is not logged in (public routes that adapt). */
export function optionalSession(request: Request, secret?: string): Promise<Session | null> {
  return sessionFromRequest(request, secret);
}

/**
 * Ownership, not roles: the product has no RBAC. Fails closed, so a missing owner is a denial.
 */
export function assertOwns(session: Session, ownerId: string | null | undefined): void {
  if (!ownerId || session.userId !== ownerId) throw new ForbiddenError();
}

/** Operator access is explicit user-id membership, not a role; an empty or malformed list denies all. */
export function requireOperator(session: Session): void {
  if (!getOperatorUserIds().includes(session.userId)) throw new ForbiddenError();
}

/** Participant-scoped resources are concealed from nonparticipants. */
export function assertParticipant(
  session: Session,
  participantIds: readonly (string | null | undefined)[],
): void {
  if (!session.userId || !participantIds.includes(session.userId)) throw new NotFoundError();
}

/** Until E01 supplies its invitation-backed resolver, pilot membership is denied by default. */
export async function requirePilotMember(
  request: Request,
  resolver?: PilotMemberResolver,
  secret?: string,
): Promise<Session> {
  const session = await requireSession(request, secret);
  if (!resolver || !(await resolver(session, request))) throw new NotFoundError();
  return session;
}

const isProduction = () => process.env.NODE_ENV === 'production';

/** The Set-Cookie value that logs `userId` in. */
export async function issueSessionCookie(userId: string): Promise<string> {
  return buildSessionCookie(await signSession(userId, getEnv().JWT_SECRET), isProduction());
}

/** The Set-Cookie value that logs out. */
export function clearSessionCookie(): string {
  return buildClearedSessionCookie(isProduction());
}
