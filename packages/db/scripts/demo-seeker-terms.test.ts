import type { TermsRepository, TermsVersion } from '../src';
import { DEMO_SEEKER_TERMS_BODY, DEMO_SEEKER_TERMS_VERSION, ensureDemoSeekerTerms } from './demo-seeker-terms';

const now = new Date('2026-11-14T12:00:00.000Z');
const publishedVersion = { id: 'terms-1', kind: 'seeker', version: DEMO_SEEKER_TERMS_VERSION } as TermsVersion;

function repository(current: TermsVersion | null) {
  const termsRepository = {
    current: jest.fn(async () => current),
    createDraft: jest.fn(async () => ({ id: 'terms-1' } as TermsVersion)),
    recordReview: jest.fn(async () => ({})),
    publish: jest.fn(async () => publishedVersion),
  };
  return termsRepository;
}

describe('ensureDemoSeekerTerms', () => {
  it('publishes an explicitly synthetic fixture with a matching review when no terms exist', async () => {
    const termsRepository = repository(null);

    await expect(ensureDemoSeekerTerms(termsRepository as unknown as TermsRepository, 'operator-id', now))
      .resolves.toEqual(publishedVersion);

    expect(termsRepository.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'seeker',
      version: DEMO_SEEKER_TERMS_VERSION,
      body: expect.stringContaining('not legal advice or production terms'),
      createdBy: 'operator-id',
    }));
    expect(termsRepository.recordReview).toHaveBeenCalledWith(expect.objectContaining({
      outcome: 'pass',
      reviewer: 'Local demo fixture (not a legal review)',
      note: expect.stringContaining('not approved for production'),
      recordedBy: 'operator-id',
    }));
    expect(termsRepository.publish).toHaveBeenCalledWith('terms-1', now);
    expect(DEMO_SEEKER_TERMS_BODY).toContain('synthetic fixture');
  });

  it('leaves an existing published seeker terms version unchanged', async () => {
    const termsRepository = repository(publishedVersion);

    await expect(ensureDemoSeekerTerms(termsRepository as unknown as TermsRepository, 'operator-id', now))
      .resolves.toBeNull();

    expect(termsRepository.createDraft).not.toHaveBeenCalled();
    expect(termsRepository.recordReview).not.toHaveBeenCalled();
    expect(termsRepository.publish).not.toHaveBeenCalled();
  });
});
