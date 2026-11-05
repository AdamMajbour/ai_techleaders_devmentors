/** @jest-environment node */
import type { MentorProfile, MentorProfileRepository } from '@devmentor/db';
import { ForbiddenError, NotFoundError } from '../../http/errors';
import { MentorService, normalizeMentorSlug, normalizeTechnologySlugs } from './mentor.service';

const SESSION = { userId: 'mentor-user' };
const profile = (overrides: Partial<MentorProfile> = {}) =>
  ({
    id: 'profile-id',
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
  isAcceptedMentor = true,
) {
  const mentorProfileRepository = repository as unknown as MentorProfileRepository;
  const invitationService = { isAcceptedMentor: jest.fn(async () => isAcceptedMentor) };
  return {
    service: new MentorService({ mentorProfileRepository, invitationService }),
    mentorProfileRepository,
    invitationService,
  };
}

describe('MentorService', () => {
  it('filters technologies in service over the listed-profile repository result', async () => {
    const findListed = jest.fn(async () => [
      profile({ technologies: 'typescript node-js' }),
      profile({ id: 'other', slug: 'grace-hopper', technologies: 'python' }),
    ]);
    const { service } = setup({ findListed });

    const result = await service.list('Node.js');

    expect(findListed).toHaveBeenCalledWith();
    expect(result.map(({ slug }) => slug)).toEqual(['ada-lovelace']);
    await expect(service.list('!!!')).resolves.toEqual([]);
  });

  it('returns an unlisted profile by normalized slug', async () => {
    const findBySlug = jest.fn(async () => profile({ isListed: false }));
    const { service } = setup({ findBySlug });

    await expect(service.getBySlug('  ADA Lovelace ')).resolves.toMatchObject({
      slug: 'ada-lovelace',
      isListed: false,
    });
    expect(findBySlug).toHaveBeenCalledWith('ada-lovelace');
  });

  it('requires an accepted mentor invitation before creating and takes ownership from session', async () => {
    const create = jest.fn(async (data: Partial<MentorProfile>) => profile({ ...data }));
    const { service, mentorProfileRepository, invitationService } = setup({ create });
    const input = {
      slug: 'Ada Lovelace',
      headline: 'Backend mentor',
      bio: 'A helpful mentor.',
      technologies: 'TypeScript node.js TypeScript',
      publicWorkUrl: 'https://example.com',
      isListed: true,
    };

    const result = await service.create(SESSION, input);

    expect(invitationService.isAcceptedMentor).toHaveBeenCalledWith('mentor-user');
    expect(mentorProfileRepository.create).toHaveBeenCalledWith({
      ...input,
      userId: 'mentor-user',
      slug: 'ada-lovelace',
      technologies: 'node-js typescript',
      lastActiveAt: null,
    });
    expect(result.userId).toBe('mentor-user');
  });

  it.each(['uninvited user', 'seeker-only user'])(
    'refuses a %s from creating a mentor profile',
    async () => {
      const create = jest.fn();
      const { service } = setup({ create }, false);

      await expect(
        service.create(SESSION, {
          slug: 'ada',
          headline: 'Backend mentor',
          bio: 'Bio',
          technologies: 'typescript',
          publicWorkUrl: 'https://example.com',
          isListed: false,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('normalizes technology slugs consistently and reports missing profiles', async () => {
    expect(normalizeTechnologySlugs('Node.js, TypeScript node-js')).toBe('node-js typescript');
    expect(normalizeMentorSlug(' Ada  Lovelace! ')).toBe('ada-lovelace');
    const { service } = setup({ findBySlug: jest.fn(async () => null) });
    await expect(service.getBySlug('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
