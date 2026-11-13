import { RetentionService } from './retention.service';

const operatorId = '00000000-0000-4000-8000-000000000001';
const holdId = '00000000-0000-4000-8000-000000000002';

describe('RetentionService legal holds', () => {
  const previous = process.env.OPERATOR_USER_IDS;
  beforeEach(() => { process.env.OPERATOR_USER_IDS = operatorId; });
  afterAll(() => {
    if (previous === undefined) delete process.env.OPERATOR_USER_IDS;
    else process.env.OPERATOR_USER_IDS = previous;
  });

  it('records the operator, timestamp, target, and reason when placing a hold', async () => {
    const addLegalHold = jest.fn(async (input: { createdBy: string; contentType: string; contentId: string; reason: string; at: Date }) => ({ id: holdId, ...input, releasedAt: null, releaseReason: null }));
    const service = new RetentionService({ retentionRepository: { addLegalHold } as never, clock: { now: () => new Date('2026-11-12T12:00:00.000Z') } as never });
    await service.createHold({ userId: operatorId }, { contentType: 'message', contentId: holdId, reason: 'Preserve for documented legal request.' });
    expect(addLegalHold).toHaveBeenCalledWith(expect.objectContaining({ createdBy: operatorId, contentType: 'message', contentId: holdId, at: new Date('2026-11-12T12:00:00.000Z') }));
  });

  it('records the operator and reason when releasing a hold', async () => {
    const releaseLegalHold = jest.fn(async () => true);
    const service = new RetentionService({ retentionRepository: { releaseLegalHold } as never, clock: { now: () => new Date('2026-11-13T12:00:00.000Z') } as never });
    await expect(service.releaseHold({ userId: operatorId }, holdId, { reason: 'The preservation request has ended.' })).resolves.toEqual({ released: true });
    expect(releaseLegalHold).toHaveBeenCalledWith(expect.objectContaining({ id: holdId, releasedBy: operatorId, reason: 'The preservation request has ended.' }));
  });
});
