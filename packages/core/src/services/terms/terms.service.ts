import { createHash } from 'node:crypto';
import type { TermsRepository } from '@devmentor/db';
import { requireOperator } from '../../http/auth';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';

export type TermsKind = 'seeker' | 'mentor';
export type TermsScope = 'terms' | 'payment_handling' | 'ai_notice_and_processors';

export class TermsService {
  constructor(private readonly dependencies: { termsRepository: TermsRepository; clock: Clock }) {}

  async current(kind: TermsKind) {
    const version = await this.dependencies.termsRepository.current(kind);
    if (!version) return null;
    return {
      id: version.id, kind: version.kind, version: version.version,
      body: version.body, sha256: version.sha256, publishedAt: version.publishedAt?.toISOString() ?? null,
      reviewed: await this.dependencies.termsRepository.hasPassingReview(version),
    };
  }

  async accepted(session: Session | null, kind: TermsKind) {
    if (!session?.userId) throw new UnauthorizedError();
    const rows = await this.dependencies.termsRepository.acceptances(session.userId, kind);
    return Promise.all(rows.map(async (row) => {
      const version = await this.dependencies.termsRepository.byId(row.termsVersionId);
      return { version: version?.version ?? 'unavailable', sha256: row.sha256, acceptedAt: row.acceptedAt.toISOString(), subjectType: row.subjectType, subjectId: row.subjectId };
    }));
  }

  async hasAcceptedCurrent(userId: string, kind: TermsKind): Promise<boolean> {
    const version = await this.dependencies.termsRepository.current(kind);
    return version ? this.dependencies.termsRepository.hasAccepted(userId, version) : false;
  }

  async createDraft(session: Session, input: { kind: TermsKind; version: string; body: string }) {
    requireOperator(session);
    const body = input.body.trim();
    if (!body) throw new ConflictError('Supply the owner-approved terms text before creating a draft.');
    const sha256 = createHash('sha256').update(body, 'utf8').digest('hex');
    const version = await this.dependencies.termsRepository.createDraft({
      kind: input.kind, version: input.version, body, sha256, createdBy: session.userId,
    });
    return { id: version.id, kind: version.kind, version: version.version, sha256: version.sha256, status: version.status };
  }

  async recordReview(session: Session, input: {
    termsVersionId: string; sha256: string; reviewer: string; scopes: TermsScope[];
    outcome: 'pass' | 'fail'; note?: string;
  }) {
    requireOperator(session);
    const version = await this.dependencies.termsRepository.byId(input.termsVersionId);
    if (!version) throw new NotFoundError();
    if (version.sha256 !== input.sha256) throw new ConflictError('The reviewed digest does not match this terms version.');
    if (input.outcome === 'pass' && !['terms', 'payment_handling', 'ai_notice_and_processors'].every((scope) => input.scopes.includes(scope as TermsScope))) {
      throw new ConflictError('A passing review must cover terms, payment handling, and AI notice/processors.');
    }
    return this.dependencies.termsRepository.recordReview({
      termsVersionId: version.id, sha256: input.sha256, reviewer: input.reviewer.trim(),
      scopes: input.scopes, outcome: input.outcome, reviewedAt: this.dependencies.clock.now(),
      note: input.note?.trim() || null, recordedBy: session.userId,
    });
  }

  async publish(session: Session, id: string) {
    requireOperator(session);
    const version = await this.dependencies.termsRepository.byId(id);
    if (!version) throw new NotFoundError();
    if (!(await this.dependencies.termsRepository.hasPassingReview(version))) {
      throw new ConflictError('A passing verifier review of this exact version is required before publication.');
    }
    const published = await this.dependencies.termsRepository.publish(id, this.dependencies.clock.now());
    if (!published) throw new ConflictError('Only a draft version can be published.');
    return { id: published.id, kind: published.kind, version: published.version, sha256: published.sha256, publishedAt: published.publishedAt?.toISOString() };
  }

  async accept(session: Session | null, input: { kind: TermsKind; versionId: string; sha256: string }) {
    if (!session?.userId) throw new UnauthorizedError();
    const version = await this.dependencies.termsRepository.current(input.kind);
    if (!version || version.id !== input.versionId || version.sha256 !== input.sha256) {
      throw new ConflictError('The terms changed. Read and accept the current version.');
    }
    if (!(await this.dependencies.termsRepository.hasPassingReview(version))) {
      throw new ConflictError('These terms are not available for acceptance until review is complete.');
    }
    await this.dependencies.termsRepository.accept({
      userId: session.userId, termsVersionId: version.id, sha256: version.sha256,
      kind: input.kind, acceptedAt: this.dependencies.clock.now(), subjectType: null, subjectId: null,
    });
    return { accepted: true, version: version.version, sha256: version.sha256 };
  }

  async acceptAtCheckout(userId: string, kind: TermsKind, subjectType: 'booking' | 'vault_answer', subjectId: string, expected: { versionId: string; sha256: string }) {
    const version = await this.assertReady(kind);
    if (version.id !== expected.versionId || version.sha256 !== expected.sha256) {
      throw new ConflictError('The terms changed. Read and accept the current version before checkout.');
    }
    await this.dependencies.termsRepository.accept({
      userId, termsVersionId: version.id, sha256: version.sha256, kind,
      acceptedAt: this.dependencies.clock.now(), subjectType, subjectId,
    });
    return version;
  }

  async acceptForNotePublication(userId: string, expected: { versionId: string; sha256: string }) {
    const version = await this.assertReady('mentor');
    if (version.id !== expected.versionId || version.sha256 !== expected.sha256) {
      throw new ConflictError('The mentor terms changed. Read and accept the current version before publishing.');
    }
    await this.dependencies.termsRepository.accept({
      userId, termsVersionId: version.id, sha256: version.sha256, kind: 'mentor',
      acceptedAt: this.dependencies.clock.now(), subjectType: null, subjectId: null,
    });
    return version;
  }

  async assertReady(kind: TermsKind) {
    const version = await this.dependencies.termsRepository.current(kind);
    if (!version || !(await this.dependencies.termsRepository.hasPassingReview(version))) {
      throw new ConflictError('This action is unavailable until the current pilot terms have been reviewed and published.');
    }
    return version;
  }

  async assertCurrent(kind: TermsKind, expected: { versionId: string; sha256: string }) {
    const version = await this.assertReady(kind);
    if (version.id !== expected.versionId || version.sha256 !== expected.sha256) {
      throw new ConflictError('The terms changed. Read and accept the current version before continuing.');
    }
    return version;
  }
}
