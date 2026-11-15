/** @jest-environment node */
import { MentorInvitationService, INVITATION_BATCH_SIZE, resolveMentorInvitationStatus } from './mentor-invitation.service';

const NOW = new Date('2026-11-15T12:00:00.000Z');
const OPERATOR_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const acceptedAt = new Date('2026-11-01T12:00:00.000Z');
const dueAt = new Date('2026-11-15T12:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mentor-invitation-1',
    email: 'ada@example.com',
    displayName: 'Ada',
    stackTags: '["typescript"]',
    batchId: 'batch-1',
    accessInvitationId: 'access-1',
    acceptedByUserId: USER_ID,
    acceptedAt,
    expiresAt: new Date('2026-12-01T12:00:00.000Z'),
    publishDueAt: dueAt,
    revokedAt: null,
    createdAt: new Date('2026-10-30T12:00:00.000Z'),
    updatedAt: NOW,
    ...overrides,
  };
}

function batch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    number: 1,
    openedBy: OPERATOR_ID,
    openedAt: new Date('2026-10-30T12:00:00.000Z'),
    closedAt: new Date('2026-11-01T12:00:00.000Z'),
    resumedAt: null,
    resumedBy: null,
    ...overrides,
  };
}

function setup(overrides: Record<string, unknown> = {}) {
  process.env.OPERATOR_USER_IDS = OPERATOR_ID;
  const invitationBatchRepository = {
    lockWorkflow: jest.fn(async () => undefined),
    findAll: jest.fn(async () => []),
    findOpen: jest.fn(async () => null),
    findLatest: jest.fn(async () => null),
    create: jest.fn(async (input: Record<string, unknown>) => ({ ...batch(input), id: 'batch-new' })),
    close: jest.fn(async () => undefined),
  };
  const mentorInvitationRepository = {
    findAll: jest.fn(async () => []),
    findUnresolvedByEmail: jest.fn(async () => null),
    create: jest.fn(async (input: Record<string, unknown>) => ({ ...row(input), id: 'mentor-invitation-new' })),
    acceptLatest: jest.fn(async () => true),
  };
  const invitationRepository = { findByEmail: jest.fn(async () => null) };
  const userRepository = { findByEmail: jest.fn(async () => null), findById: jest.fn(async () => ({ id: USER_ID, name: 'Ada' })) };
  const availabilitySlotRepository = { findCreatedInRangeForMentors: jest.fn(async () => []) };
  const invitationService = {
    isAcceptedMentor: jest.fn(async () => false),
    invite: jest.fn(async () => ({ id: 'access-1', email: 'ada@example.com', displayName: 'Ada', role: 'mentor', revokedAt: null })),
  };
  const magicLinkService = { issue: jest.fn(async () => ({ token: 'raw-token', expiresAt: new Date('2026-12-15T12:00:00.000Z') })) };
  const unitOfWork = { run: jest.fn(async <T>(work: () => Promise<T>) => work()) };
  const mailer = { send: jest.fn(async () => undefined) };
  const clock = { now: () => NOW };
  const service = new MentorInvitationService({
    invitationBatchRepository: invitationBatchRepository as never,
    mentorInvitationRepository: mentorInvitationRepository as never,
    invitationRepository: invitationRepository as never,
    userRepository: userRepository as never,
    availabilitySlotRepository: availabilitySlotRepository as never,
    invitationService: invitationService as never,
    magicLinkService: magicLinkService as never,
    unitOfWork: unitOfWork as never,
    mailer: mailer as never,
    clock,
    publishWindowDays: () => 14,
    appBaseUrl: () => 'https://devmentor.example',
  });
  Object.assign(invitationBatchRepository, overrides.invitationBatchRepository ?? {});
  Object.assign(mentorInvitationRepository, overrides.mentorInvitationRepository ?? {});
  Object.assign(availabilitySlotRepository, overrides.availabilitySlotRepository ?? {});
  Object.assign(mailer, overrides.mailer ?? {});
  return { service, invitationBatchRepository, mentorInvitationRepository, invitationRepository, userRepository, availabilitySlotRepository, invitationService, magicLinkService, unitOfWork, mailer };
}

describe('resolveMentorInvitationStatus', () => {
  const expiresAt = new Date('2026-11-10T12:00:00.000Z');
  it('prioritizes revocation and distinguishes waiting from expired at the exact boundary', () => {
    expect(resolveMentorInvitationStatus({ now: NOW, revokedAt: NOW, acceptedAt: null, expiresAt, publishDueAt: null, hasPublishedSlot: false })).toBe('Revoked');
    expect(resolveMentorInvitationStatus({ now: expiresAt, revokedAt: null, acceptedAt: null, expiresAt, publishDueAt: null, hasPublishedSlot: false })).toBe('Expired, not accepted');
    expect(resolveMentorInvitationStatus({ now: new Date(expiresAt.getTime() - 1), revokedAt: null, acceptedAt: null, expiresAt, publishDueAt: null, hasPublishedSlot: false })).toBe('Waiting for acceptance');
  });

  it('counts slots at both inclusive acceptance-window boundaries', () => {
    expect(resolveMentorInvitationStatus({ now: NOW, revokedAt: null, acceptedAt, expiresAt, publishDueAt: dueAt, hasPublishedSlot: true })).toBe('Published a slot');
  });

  it('keeps accepted invitations open at publishDueAt and overdue one millisecond later', () => {
    expect(resolveMentorInvitationStatus({ now: dueAt, revokedAt: null, acceptedAt, expiresAt, publishDueAt: dueAt, hasPublishedSlot: false })).toBe('Accepted, no slot yet');
    expect(resolveMentorInvitationStatus({ now: new Date(dueAt.getTime() + 1), revokedAt: null, acceptedAt, expiresAt, publishDueAt: dueAt, hasPublishedSlot: false })).toBe('No slot within two weeks');
  });
});

describe('MentorInvitationService', () => {
  it('returns batch counters and counts a cancelled slot created in the publish window', async () => {
    const slot = { mentorId: USER_ID, createdAt: new Date('2026-11-15T12:00:00.000Z'), status: 'cancelled' };
    const { service, availabilitySlotRepository } = setup({
      invitationBatchRepository: { findAll: jest.fn(async () => [batch()]) },
      mentorInvitationRepository: { findAll: jest.fn(async () => [row()]) },
      availabilitySlotRepository: { findCreatedInRangeForMentors: jest.fn(async () => [slot]) },
    });
    const overview = await service.list({ userId: OPERATOR_ID });
    expect(overview.batches[0]).toMatchObject({ sent: 1, accepted: 1, published: 1, state: 'Full' });
    expect(overview.batches[0].invitations[0].status).toBe('Published a slot');
    expect(availabilitySlotRepository.findCreatedInRangeForMentors).toHaveBeenCalled();
  });

  it.each([4, 5])('stops batch invitations only below five published slots (%i)', async (publishedCount) => {
    const firstBatch = batch();
    const invitations = Array.from({ length: INVITATION_BATCH_SIZE }, (_unused, index) => row({
      id: `invite-${index}`,
      email: `mentor-${index}@example.com`,
      acceptedByUserId: `user-${index}`,
      publishDueAt: new Date('2026-11-01T12:00:00.000Z'),
    }));
    const slots = invitations.slice(0, publishedCount).map((invitation) => ({
      mentorId: invitation.acceptedByUserId,
      createdAt: new Date('2026-11-01T12:00:00.000Z'),
    }));
    const { service } = setup({
      invitationBatchRepository: { findAll: jest.fn(async () => [firstBatch]) },
      mentorInvitationRepository: { findAll: jest.fn(async () => invitations) },
      availabilitySlotRepository: { findCreatedInRangeForMentors: jest.fn(async () => slots) },
    });
    const overview = await service.list({ userId: OPERATOR_ID });
    expect(overview.stopped).toBe(publishedCount === 4);
  });

  it('does not resolve the stop rule while one invite is waiting or inside its window, and resumedAt clears it', async () => {
    const invitations = Array.from({ length: INVITATION_BATCH_SIZE }, (_unused, index) => row({
      id: `invite-${index}`,
      email: `mentor-${index}@example.com`,
      acceptedByUserId: `user-${index}`,
      publishDueAt: new Date('2026-11-01T12:00:00.000Z'),
    }));
    invitations[0] = row({ ...invitations[0], acceptedAt: null, publishDueAt: null, expiresAt: new Date('2026-11-16T12:00:00.000Z') });
    const deps = {
      mentorInvitationRepository: { findAll: jest.fn(async () => invitations) },
      availabilitySlotRepository: { findCreatedInRangeForMentors: jest.fn(async () => []) },
    };
    const waiting = setup({ invitationBatchRepository: { findAll: jest.fn(async () => [batch()]) }, ...deps });
    expect((await waiting.service.list({ userId: OPERATOR_ID })).stopped).toBe(false);
    const inWindowRows = invitations.map((invitation) => ({ ...invitation, acceptedAt, publishDueAt: new Date('2026-11-16T12:00:00.000Z') }));
    const inWindow = setup({
      invitationBatchRepository: { findAll: jest.fn(async () => [batch()]) },
      mentorInvitationRepository: { findAll: jest.fn(async () => inWindowRows) },
      availabilitySlotRepository: { findCreatedInRangeForMentors: jest.fn(async () => []) },
    });
    expect((await inWindow.service.list({ userId: OPERATOR_ID })).stopped).toBe(false);
    const resumed = setup({ invitationBatchRepository: { findAll: jest.fn(async () => [batch({ resumedAt: NOW })]) }, ...deps });
    expect((await resumed.service.list({ userId: OPERATOR_ID })).stopped).toBe(false);
  });

  it('opens a sequential batch through the serialized service transaction', async () => {
    const latest = batch({ number: 2 });
    const { service, invitationBatchRepository, unitOfWork } = setup({
      invitationBatchRepository: {
        findOpen: jest.fn(async () => null),
        findLatest: jest.fn(async () => latest),
        create: jest.fn(async (input: Record<string, unknown>) => ({ ...latest, ...input, id: 'batch-3' })),
      },
    });
    await expect(service.openBatch({ userId: OPERATOR_ID })).resolves.toMatchObject({ number: 3 });
    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(invitationBatchRepository.lockWorkflow).toHaveBeenCalledTimes(1);
  });

  it('returns the specified open/full conflicts without creating a row', async () => {
    const noBatch = setup();
    await expect(noBatch.service.create({ userId: OPERATOR_ID }, { email: 'ada@example.com', stackTags: ['typescript'] })).rejects.toThrow('No batch is open yet; open the first batch.');
    const full = setup({
      invitationBatchRepository: { findOpen: jest.fn(async () => batch({ closedAt: null })), findAll: jest.fn(async () => [batch({ closedAt: null })]) },
      mentorInvitationRepository: { findAll: jest.fn(async () => Array.from({ length: 20 }, (_unused, index) => row({ id: `full-${index}` }))) },
    });
    await expect(full.service.create({ userId: OPERATOR_ID }, { email: 'ada@example.com', stackTags: ['typescript'] })).rejects.toThrow('This batch is full; open a new batch.');
    expect(full.mentorInvitationRepository.create).not.toHaveBeenCalled();
  });

  it('sends the invitation link but returns no token or URL in the API DTO', async () => {
    const openBatch = batch({ closedAt: null });
    const { service, mailer, magicLinkService, mentorInvitationRepository } = setup({
      invitationBatchRepository: { findOpen: jest.fn(async () => openBatch), findAll: jest.fn(async () => [{ ...openBatch, number: 1 }]) },
    });
    const result = await service.create({ userId: OPERATOR_ID }, { email: ' Ada@Example.COM ', stackTags: ['typescript'] });
    expect(result).toMatchObject({ email: 'ada@example.com', batchNumber: 1 });
    expect(JSON.stringify(result)).not.toMatch(/raw-token|auth\/verify/);
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ada@example.com',
      template: 'mentor-invitation',
      data: expect.objectContaining({ url: expect.stringContaining('raw-token') }),
    }));
    expect(magicLinkService.issue).toHaveBeenCalledWith('ada@example.com', expect.any(Number));
    expect(mentorInvitationRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com', batchId: 'batch-1' }));
  });

  it('maps a mailer rejection to 503 after attempting the same transaction', async () => {
    const openBatch = batch({ closedAt: null });
    const { service, unitOfWork } = setup({
      invitationBatchRepository: { findOpen: jest.fn(async () => openBatch), findAll: jest.fn(async () => [{ ...openBatch, number: 1 }]) },
      mailer: { send: jest.fn(async () => { throw new Error('provider failed'); }) },
    });
    await expect(service.create({ userId: OPERATOR_ID }, { email: 'ada@example.com', stackTags: ['typescript'] })).rejects.toMatchObject({
      status: 503,
      message: 'The invitation email could not be sent. Nothing was saved; try again.',
    });
    expect(unitOfWork.run).toHaveBeenCalledTimes(1);
  });
});
