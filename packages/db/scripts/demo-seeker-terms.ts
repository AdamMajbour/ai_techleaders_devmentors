import { createHash } from 'node:crypto';
import type { TermsRepository, TermsVersion } from '../src';

export const DEMO_SEEKER_TERMS_VERSION = 'local-demo-1';
export const DEMO_SEEKER_TERMS_BODY = [
  '# Local demo terms (synthetic)',
  '',
  'This is a synthetic fixture for local development and training only. It is not legal advice or production terms and has no legal effect.',
  '',
  'For this demo, booking data is used only to show the booking and mock checkout flow. Do not enter real personal or confidential information.',
].join('\n');

/** Creates clearly synthetic, non-production terms only when no seeker terms exist. */
export async function ensureDemoSeekerTerms(
  termsRepository: TermsRepository,
  createdBy: string,
  now: Date,
): Promise<TermsVersion | null> {
  if (await termsRepository.current('seeker')) return null;

  const sha256 = createHash('sha256').update(DEMO_SEEKER_TERMS_BODY, 'utf8').digest('hex');
  const draft = await termsRepository.createDraft({
    kind: 'seeker',
    version: DEMO_SEEKER_TERMS_VERSION,
    body: DEMO_SEEKER_TERMS_BODY,
    sha256,
    createdBy,
  });
  await termsRepository.recordReview({
    termsVersionId: draft.id,
    sha256,
    reviewer: 'Local demo fixture (not a legal review)',
    scopes: ['terms', 'payment_handling', 'ai_notice_and_processors'],
    outcome: 'pass',
    reviewedAt: now,
    note: 'Synthetic local-development fixture only; not approved for production use.',
    recordedBy: createdBy,
  });
  const published = await termsRepository.publish(draft.id, now);
  if (!published) throw new Error('Could not publish the local demo seeker terms fixture.');
  return published;
}
