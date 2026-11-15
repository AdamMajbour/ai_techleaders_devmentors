import { ConflictError } from '../../http/errors';
import { TermsService } from './terms.service';

const version = {
  id: '00000000-0000-4000-8000-000000000001', kind: 'seeker', version: 'pilot-1',
  body: 'Owner reviewed text', sha256: 'a'.repeat(64), status: 'published',
  publishedAt: new Date('2026-11-01T00:00:00.000Z'), createdBy: '00000000-0000-4000-8000-000000000002',
} as const;

function setup(options: { current?: typeof version | null; reviewed?: boolean } = {}) {
  const termsRepository = {
    current: jest.fn(async () => options.current === undefined ? version : options.current),
    hasPassingReview: jest.fn(async () => options.reviewed ?? true),
    accept: jest.fn(async () => undefined),
    acceptances: jest.fn(async () => []),
    byId: jest.fn(async () => version),
  };
  const clock = { now: () => new Date('2026-11-12T12:00:00.000Z') };
  return { service: new TermsService({ termsRepository: termsRepository as never, clock }), termsRepository };
}

describe('TermsService consent version checks', () => {
  it('blocks checkout when no published seeker terms exist', async () => {
    const { service, termsRepository } = setup({ current: null });

    await expect(service.assertReady('seeker')).rejects.toBeInstanceOf(ConflictError);
    expect(termsRepository.accept).not.toHaveBeenCalled();
  });

  it('blocks checkout when the current terms do not have a passing review', async () => {
    const { service, termsRepository } = setup({ reviewed: false });

    await expect(service.assertReady('seeker')).rejects.toBeInstanceOf(ConflictError);
    expect(termsRepository.accept).not.toHaveBeenCalled();
  });

  it('stores checkout acceptance against the exact current version and subject', async () => {
    const { service, termsRepository } = setup();
    await service.acceptAtCheckout('00000000-0000-4000-8000-000000000003', 'seeker', 'booking', '00000000-0000-4000-8000-000000000004', { versionId: version.id, sha256: version.sha256 });
    expect(termsRepository.accept).toHaveBeenCalledWith(expect.objectContaining({
      termsVersionId: version.id, sha256: version.sha256, subjectType: 'booking',
      subjectId: '00000000-0000-4000-8000-000000000004',
    }));
  });

  it('rejects stale version or digest before recording acceptance', async () => {
    const { service, termsRepository } = setup();
    await expect(service.assertCurrent('seeker', { versionId: version.id, sha256: 'b'.repeat(64) })).rejects.toBeInstanceOf(ConflictError);
    expect(termsRepository.accept).not.toHaveBeenCalled();
  });

  it('records mentor consent against the exact current version before note publication', async () => {
    const { service, termsRepository } = setup();
    await service.acceptForNotePublication('00000000-0000-4000-8000-000000000003', { versionId: version.id, sha256: version.sha256 });
    expect(termsRepository.accept).toHaveBeenCalledWith(expect.objectContaining({ kind: 'mentor', termsVersionId: version.id, sha256: version.sha256, subjectType: null, subjectId: null }));
  });
});
