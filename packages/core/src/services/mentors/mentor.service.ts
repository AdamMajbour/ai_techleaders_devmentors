import type { MentorProfile, MentorProfileRepository, MentorProfileUpdate } from '@devmentor/db';
import { assertOwns } from '../../http/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../../http/errors';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import type { InvitationService } from '../auth/invitation.service';
import type { Page } from '../dto';
import {
  MENTOR_PAGE_SIZE,
  mentorProfileDtoSchema,
  type MentorActivity,
  type MentorListQuery,
  type MentorProfileDto,
  type MentorProfileInput,
  type MentorProfileUpdateInput,
} from '../../validators/mentors/mentor-profile.schema';

export type { MentorProfileDto, MentorProfileInput };
export type MentorProfileChanges = MentorProfileUpdateInput;

type Dependencies = {
  mentorProfileRepository: MentorProfileRepository;
  invitationService: Pick<InvitationService, 'isAcceptedMentor' | 'isPilotMember'>;
  clock: Clock;
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

function activityFor(lastActiveAt: Date | null | undefined, now: Date): MentorActivity {
  if (!lastActiveAt) return 'never';

  const age = now.getTime() - lastActiveAt.getTime();
  if (age >= 0 && age < 60 * 60 * 1000) return 'within_hour';
  if (
    lastActiveAt.getUTCFullYear() === now.getUTCFullYear() &&
    lastActiveAt.getUTCMonth() === now.getUTCMonth() &&
    lastActiveAt.getUTCDate() === now.getUTCDate()
  ) {
    return 'today';
  }
  return 'earlier';
}

function toMentorProfile(profile: MentorProfile, now: Date): MentorProfileDto {
  return mentorProfileDtoSchema.parse({
    id: profile.id,
    slug: profile.slug,
    headline: profile.headline,
    bio: profile.bio,
    technologies: profile.technologies,
    publicWorkUrl: profile.publicWorkUrl,
    isListed: profile.isListed,
    activity: activityFor(profile.lastActiveAt, now),
  });
}

export class MentorService {
  private readonly mentorProfileRepository: MentorProfileRepository;
  private readonly invitationService: Pick<InvitationService, 'isAcceptedMentor' | 'isPilotMember'>;
  private readonly clock: Clock;

  constructor({ mentorProfileRepository, invitationService, clock }: Dependencies) {
    this.mentorProfileRepository = mentorProfileRepository;
    this.invitationService = invitationService;
    this.clock = clock;
  }

  async list(session: Session, { technology, page }: MentorListQuery): Promise<Page<MentorProfileDto>> {
    await this.requirePilotMember(session);
    const profiles = await this.mentorProfileRepository.findListed();
    const filter = technology?.trim() ? normalizeTechnologySlugs(technology) : null;
    const filtered = filter === ''
      ? []
      : profiles.filter((profile) =>
        profile.isListed &&
        (filter === null || normalizeTechnologySlugs(profile.technologies).split(' ').includes(filter)),
      );
    const pageSize = MENTOR_PAGE_SIZE;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);
    const now = this.clock.now();
    return {
      items: items.map((profile) => toMentorProfile(profile, now)),
      page,
      pageSize,
      total: filtered.length,
      pageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
    };
  }

  async getBySlug(session: Session, slug: string): Promise<MentorProfileDto> {
    await this.requirePilotMember(session);
    const profile = await this.findBySlug(slug);
    return toMentorProfile(profile, this.clock.now());
  }

  async getById(session: Session, id: string): Promise<MentorProfileDto> {
    await this.requirePilotMember(session);
    const profile = await this.mentorProfileRepository.findById(id);
    if (!profile || (!profile.isListed && profile.userId !== session.userId)) {
      throw new NotFoundError('Mentor profile not found.');
    }
    return toMentorProfile(profile, this.clock.now());
  }

  async create(session: Session, input: MentorProfileInput): Promise<MentorProfileDto> {
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
    return toMentorProfile(profile, this.clock.now());
  }

  async recordSignInActivity(userId: string): Promise<void> {
    if (!(await this.invitationService.isAcceptedMentor(userId))) return;
    const profile = await this.mentorProfileRepository.findByUserId(userId);
    if (profile) await this.mentorProfileRepository.update(profile.id, { lastActiveAt: this.clock.now() });
  }

  async update(session: Session, id: string, changes: MentorProfileChanges): Promise<MentorProfileDto> {
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
    normalized.lastActiveAt = this.clock.now();
    const updated = await this.mentorProfileRepository.update(id, normalized);
    if (!updated) throw new NotFoundError('Mentor profile not found.');
    return toMentorProfile(updated, this.clock.now());
  }

  private async findBySlug(slug: string): Promise<MentorProfile> {
    const profile = await this.mentorProfileRepository.findBySlug(normalizeMentorSlug(slug));
    if (!profile) throw new NotFoundError('Mentor profile not found.');
    return profile;
  }

  private async requirePilotMember(session: Session): Promise<void> {
    if (!(await this.invitationService.isPilotMember(session.userId))) throw new NotFoundError();
  }

  private async requireMentorInvitation(userId: string): Promise<void> {
    if (!(await this.invitationService.isAcceptedMentor(userId))) throw new ForbiddenError();
  }
}
