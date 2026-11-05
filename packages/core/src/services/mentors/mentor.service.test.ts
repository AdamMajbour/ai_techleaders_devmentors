/** @jest-environment node */
import type { MentorProfile, MentorProfileRepository } from '@devmentor/db';
import { ForbiddenError, NotFoundError } from '../../http/errors';
import type { Clock } from '../../utils/clock';
import { MentorService, normalizeMentorSlug, normalizeTechnologySlugs } from './mentor.service';

const SESSION = { userId: 'mentor-user' };
const NOW = new Date('2026-11-05T12:00:00.000Z');
const IDS = [
  '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  '1c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  '2c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
];
const profile = (overrides: Partial<MentorProfile> = {}) =>
  ({
    id: IDS[0],
    userId: 'mentor-user',
    slug: 'ada-lovelace',
    headline: 'Backend mentor',
    bio: 'A helpful mentor.',
    technologies: 'node-js typescript',
    publicWorkUrl: 'https://example.com',
    isListed: true,
    lastActiveAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as MentorProfile;

function setup(
  repository: Partial<Record<keyof MentorProfileRepository, jest.Mock>> = {},
  options: { isAcceptedMentor?: boolean; isPilotMember?: boolean } = {},
) {
  const mentorProfileRepository = repository as unknown as MentorProfileRepository;
  const invitationService = {
    isAcceptedMentor: jest.fn(async () => options.isAcceptedMentor ?? true),
    isPilotMember: jest.fn(async () => options.isPilotMember ?? true),
  };
  const clock: Clock = { now: () => new Date(NOW) };
  return {
    service: new MentorService({ mentorProfileRepository, invitationService, clock }),
    mentorProfileRepository,
    invitationService,
    clock,
  };
}

const listQuery = (overrides: Partial<{ technology: string; page: number }> = {}) => ({
  page: 1,
  ...overrides,
});

describe('MentorService reads', () => {
  it('hides every read from non-members before accessing profile data', async () => {
    const repository = {
      findListed: jest.fn(async () => [profile()]),
      findBySlug: jest.fn(async () => profile()),
      findById: jest.fn(async () => profile()),
    };
    const { service, invitationService } = setup(repository, { isPilotMember: false });

    await expect(service.list(SESSION, listQuery())).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getBySlug(SESSION, 'ada-lovelace')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getById(SESSION, IDS[0])).rejects.toBeInstanceOf(NotFoundError);
    expect(invitationService.isPilotMember).toHaveBeenCalledTimes(3);
    expect(repository.findListed).not.toHaveBeenCalled();
    expect(repository.findBySlug).not.toHaveBeenCalled();
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('filters listed profiles by technology in the service and paginates results', async () => {
    const findListed = jest.fn(async () => [
      profile(),
      profile({ id: IDS[1], slug: 'grace-hopper', technologies: 'python' }),
      profile({ id: IDS[2], slug: 'hidden', technologies: 'typescript', isListed: false }),
    ]);
    const { service } = setup({ findListed });

    await expect(service.list(SESSION, listQuery({ technology: 'Node.js' }))).resolves.toMatchObject({
      items: [{ slug: 'ada-lovelace' }],
      page: 1,
      total: 1,
      pageCount: 1,
    });
    expect(findListed).toHaveBeenCalledWith();
    await expect(service.list(SESSION, listQuery({ technology: '!!!' }))).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('returns an unlisted profile by slug, but not by UUID to another member', async () => {
    const hidden = profile({ isListed: false });
    const { service } = setup({
      findBySlug: jest.fn(async () => hidden),
      findById: jest.fn(async () => hidden),
    });

    await expect(service.getBySlug(SESSION, '  ADA Lovelace ')).resolves.toMatchObject({
      slug: 'ada-lovelace',
      isListed: false,
    });
    await expect(service.getById({ userId: 'other-member' }, IDS[0])).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns 404 for an unknown profile', async () => {
    const { service } = setup({
      findBySlug: jest.fn(async () => null),
      findById: jest.fn(async () => null),
    });
    await expect(service.getBySlug(SESSION, 'missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getById(SESSION, IDS[0])).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MentorService mutations', () => {
  it('requires an accepted, unrevoked mentor invitation to create a profile', async () => {
    const create = jest.fn();
    const { service, invitationService } = setup({ create }, { isAcceptedMentor: false });

    await expect(
      service.create(SESSION, {
        slug: 'ada',
        headline: 'Backend mentor',
        bio: 'Bio',
        technologies: 'typescript',
        publicWorkUrl: 'https://example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(invitationService.isAcceptedMentor).toHaveBeenCalledWith(SESSION.userId);
    expect(create).not.toHaveBeenCalled();
  });

  it('requires the owner to update and records deliberate profile activity', async () => {
    const update = jest.fn(async (_id: string, changes: Partial<MentorProfile>) => profile(changes));
    const repository = {
      findById: jest.fn(async () => profile()),
      update,
    };
    const { service } = setup(repository);

    await expect(service.update({ userId: 'other-mentor' }, IDS[0], { headline: 'New headline' }))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(update).not.toHaveBeenCalled();

    await expect(service.update(SESSION, IDS[0], { headline: 'New headline' })).resolves.toMatchObject({
      activity: 'within_hour',
    });
    expect(update).toHaveBeenCalledWith(IDS[0], {
      headline: 'New headline',
      lastActiveAt: NOW,
    });
  });

  it('records sign-in activity only for an accepted mentor with an existing profile', async () => {
    const profileUpdate = jest.fn(async (_id: string, changes: Partial<MentorProfile>) => profile(changes));
    const repository = {
      findByUserId: jest.fn(async () => profile()),
      update: profileUpdate,
    };
    const { service, invitationService } = setup(repository);

    await service.recordSignInActivity(SESSION.userId);

    expect(invitationService.isAcceptedMentor).toHaveBeenCalledWith(SESSION.userId);
    expect(repository.findByUserId).toHaveBeenCalledWith(SESSION.userId);
    expect(profileUpdate).toHaveBeenCalledWith(IDS[0], { lastActiveAt: NOW });

    const { service: nonMentor, mentorProfileRepository } = setup(
      { findByUserId: jest.fn(async () => null) },
      { isAcceptedMentor: false },
    );
    await expect(nonMentor.recordSignInActivity('seeker-user')).resolves.toBeUndefined();
    expect(mentorProfileRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('hides missing profiles on update and rejects non-mentor profile mutations', async () => {
    const { service: nonMentor } = setup({}, { isAcceptedMentor: false });
    await expect(nonMentor.update(SESSION, IDS[0], { headline: 'No' })).rejects.toBeInstanceOf(ForbiddenError);

    const { service } = setup({ findById: jest.fn(async () => null) });
    await expect(service.update(SESSION, IDS[0], { headline: 'No' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MentorService DTO and activity', () => {
  it('returns only public DTO keys and never exposes ratings or precise activity time', async () => {
    const { service } = setup({
      findBySlug: jest.fn(async () => profile({
        lastActiveAt: new Date('2026-11-05T11:30:00.000Z'),
        ...({ rating: 5, reviewCount: 12 } as unknown as Partial<MentorProfile>),
      })),
    });
    const dto = await service.getBySlug(SESSION, 'ada-lovelace');

    expect(Object.keys(dto).sort()).toEqual([
      'activity',
      'bio',
      'headline',
      'id',
      'isListed',
      'publicWorkUrl',
      'slug',
      'technologies',
    ]);
    expect(dto.activity).toBe('within_hour');
    expect(dto).not.toHaveProperty('userId');
    expect(dto).not.toHaveProperty('lastActiveAt');
    expect(dto).not.toHaveProperty('rating');
    expect(dto).not.toHaveProperty('reviewCount');
  });

  it.each([
    [new Date('2026-11-05T11:00:00.001Z'), 'within_hour'],
    [new Date('2026-11-05T11:00:00.000Z'), 'today'],
    [new Date('2026-11-04T23:59:59.999Z'), 'earlier'],
    [null, 'never'],
  ] as const)('buckets %s as %s', async (lastActiveAt, expected) => {
    const { service } = setup({
      findBySlug: jest.fn(async () => profile({ lastActiveAt })),
    });
    await expect(service.getBySlug(SESSION, 'ada-lovelace')).resolves.toMatchObject({ activity: expected });
  });
});

describe('mentor normalization', () => {
  it('normalizes technology slugs and profile slugs consistently', () => {
    expect(normalizeTechnologySlugs('Node.js, TypeScript node-js TypeScript')).toBe('node-js typescript');
    expect(normalizeMentorSlug(' Ada  Lovelace! ')).toBe('ada-lovelace');
  });
});
