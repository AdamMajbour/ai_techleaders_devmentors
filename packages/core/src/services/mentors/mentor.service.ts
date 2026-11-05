import type { MentorProfileRepository, MentorProfileUpdate } from '@devmentor/db';
import { assertOwns } from '../../http/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { InvitationService } from '../auth/invitation.service';

export type MentorProfileData = {
  id: string;
  userId: string;
  slug: string;
  headline: string;
  bio: string;
  technologies: string;
  publicWorkUrl: string;
  isListed: boolean;
  lastActiveAt: Date | null;
};

export type MentorProfileInput = Omit<MentorProfileData, 'id' | 'userId' | 'lastActiveAt' | 'isListed'> & {
  isListed?: boolean;
};
export type MentorProfileChanges = Partial<MentorProfileInput>;

type Dependencies = {
  mentorProfileRepository: MentorProfileRepository;
  invitationService: Pick<InvitationService, 'isAcceptedMentor'>;
};

export function normalizeTechnologySlugs(technologies: string | readonly string[]): string {
  const values = Array.isArray(technologies) ? technologies : [technologies];
  return [...new Set(
    values
      .flatMap((value) => value.split(/[\s,]+/))
      .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
      .filter(Boolean),
  )]
    .sort()
    .join(' ');
}

export function normalizeMentorSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!normalized) throw new ValidationError('A profile slug is required.');
  return normalized;
}

function toMentorProfile(profile: Awaited<ReturnType<MentorProfileRepository['findBySlug']>>): MentorProfileData {
  if (!profile) throw new NotFoundError('Mentor profile not found.');
  return {
    id: profile.id,
    userId: profile.userId,
    slug: profile.slug,
    headline: profile.headline,
    bio: profile.bio,
    technologies: profile.technologies,
    publicWorkUrl: profile.publicWorkUrl,
    isListed: profile.isListed,
    lastActiveAt: profile.lastActiveAt ?? null,
  };
}

export class MentorService {
  private readonly mentorProfileRepository: MentorProfileRepository;
  private readonly invitationService: Pick<InvitationService, 'isAcceptedMentor'>;

  constructor({ mentorProfileRepository, invitationService }: Dependencies) {
    this.mentorProfileRepository = mentorProfileRepository;
    this.invitationService = invitationService;
  }

  async list(technology?: string): Promise<MentorProfileData[]> {
    const profiles = await this.mentorProfileRepository.findListed();
    const filter = technology?.trim() ? normalizeTechnologySlugs(technology) : null;
    if (filter === '') return [];
    return profiles
      .filter((profile) => filter === null || normalizeTechnologySlugs(profile.technologies).split(' ').includes(filter))
      .map((profile) => toMentorProfile(profile));
  }

  async getBySlug(slug: string): Promise<MentorProfileData> {
    return toMentorProfile(await this.mentorProfileRepository.findBySlug(normalizeMentorSlug(slug)));
  }

  async getById(id: string): Promise<MentorProfileData> {
    return toMentorProfile(await this.mentorProfileRepository.findById(id));
  }

  async create(session: Session, input: MentorProfileInput): Promise<MentorProfileData> {
    await this.requireMentorInvitation(session.userId);
    const profile = await this.mentorProfileRepository.create({
      userId: session.userId,
      slug: normalizeMentorSlug(input.slug),
      headline: input.headline,
      bio: input.bio,
      technologies: normalizeTechnologySlugs(input.technologies),
      publicWorkUrl: input.publicWorkUrl,
      isListed: input.isListed ?? false,
      lastActiveAt: null,
    });
    return toMentorProfile(profile);
  }

  async update(session: Session, id: string, changes: MentorProfileChanges): Promise<MentorProfileData> {
    await this.requireMentorInvitation(session.userId);
    const existing = await this.mentorProfileRepository.findById(id);
    if (!existing) throw new NotFoundError('Mentor profile not found.');
    assertOwns(session, existing.userId);

    const normalized: MentorProfileUpdate = {};
    if (changes.slug !== undefined) normalized.slug = normalizeMentorSlug(changes.slug);
    if (changes.headline !== undefined) normalized.headline = changes.headline;
    if (changes.bio !== undefined) normalized.bio = changes.bio;
    if (changes.technologies !== undefined) normalized.technologies = normalizeTechnologySlugs(changes.technologies);
    if (changes.publicWorkUrl !== undefined) normalized.publicWorkUrl = changes.publicWorkUrl;
    if (changes.isListed !== undefined) normalized.isListed = changes.isListed;
    const updated = await this.mentorProfileRepository.update(id, normalized);
    return toMentorProfile(updated);
  }

  private async requireMentorInvitation(userId: string): Promise<void> {
    if (!(await this.invitationService.isAcceptedMentor(userId))) throw new ForbiddenError();
  }
}
