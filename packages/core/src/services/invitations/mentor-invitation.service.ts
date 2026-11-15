import {
  AvailabilitySlotRepository,
  InvitationBatchRepository,
  InvitationRepository,
  MentorInvitationRepository,
  UserRepository,
  type InvitationBatch as InvitationBatchRecord,
  type MentorInvitation as MentorInvitationRecord,
} from '@devmentor/db';
import { AppError, ConflictError } from '../../http/errors';
import { requireOperator } from '../../http/auth';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import type { UnitOfWork } from '../../workflow/unit-of-work.port';
import type { Mailer } from '../notifications/mailer.port';
import type { InvitationService } from '../auth/invitation.service';
import type { MagicLinkService } from '../auth/magic-link.service';
import { ACCOUNT_LOGIN_LINK_TTL_MS } from '../auth/magic-link.service';
import type { MentorInvitationCreateInput } from '../../validators/invitations/mentor-invitation.schema';

export const INVITATION_BATCH_SIZE = 20;
export const INVITATION_STOP_MESSAGE = 'Invitations are stopped: fewer than 5 of the first 20 published a slot within two weeks. Interview the decliners first.';
export const NO_BATCH_OPEN_MESSAGE = 'No batch is open yet; open the first batch.';
export const BATCH_FULL_MESSAGE = 'This batch is full; open a new batch.';
export const BATCH_ALREADY_OPEN_MESSAGE = 'A batch is already open.';
export const INVITATION_MAIL_FAILURE_MESSAGE = 'The invitation email could not be sent. Nothing was saved; try again.';
export const UNRESOLVED_INVITATION_MESSAGE = 'This email already has an unresolved invitation.';
export const EXISTING_MENTOR_MESSAGE = 'This email is already a mentor.';

const DAY_MS = 24 * 60 * 60 * 1000;

export type MentorInvitationStatus =
  | 'Revoked'
  | 'Waiting for acceptance'
  | 'Expired, not accepted'
  | 'Published a slot'
  | 'Accepted, no slot yet'
  | 'No slot within two weeks';

export function resolveMentorInvitationStatus(input: {
  now: Date;
  revokedAt: Date | null;
  acceptedAt: Date | null;
  expiresAt: Date;
  publishDueAt: Date | null;
  hasPublishedSlot: boolean;
}): MentorInvitationStatus {
  if (input.revokedAt) return 'Revoked';
  if (!input.acceptedAt) return input.expiresAt.getTime() > input.now.getTime()
    ? 'Waiting for acceptance'
    : 'Expired, not accepted';
  if (input.hasPublishedSlot) return 'Published a slot';
  if (input.publishDueAt && input.now.getTime() <= input.publishDueAt.getTime()) return 'Accepted, no slot yet';
  return 'No slot within two weeks';
}

export interface MentorInvitationRowDto {
  id: string;
  email: string;
  displayName: string | null;
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  publishDueAt: string | null;
  stackTags: string[];
  status: MentorInvitationStatus;
}

export type InvitationBatchState = 'Open' | 'Full' | 'Stopped';

export interface InvitationBatchDto {
  id: string;
  number: number;
  state: InvitationBatchState;
  openedAt: string;
  sent: number;
  accepted: number;
  published: number;
  invitations: MentorInvitationRowDto[];
}

export interface InvitationBatchesDto {
  batches: InvitationBatchDto[];
  stopped: boolean;
  preBatchInvitations: MentorInvitationRowDto[];
}

export interface CreatedMentorInvitationDto {
  id: string;
  email: string;
  stackTags: string[];
  batchNumber: number;
  expiresAt: string;
}

class MailRejectedSignal extends Error {}

interface Dependencies {
  invitationBatchRepository: InvitationBatchRepository;
  mentorInvitationRepository: MentorInvitationRepository;
  invitationRepository: InvitationRepository;
  userRepository: UserRepository;
  availabilitySlotRepository: AvailabilitySlotRepository;
  invitationService: InvitationService;
  magicLinkService: MagicLinkService;
  unitOfWork: UnitOfWork;
  mailer: Mailer;
  clock: Clock;
  publishWindowDays: () => number;
  appBaseUrl: () => string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseStackTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function isQualifyingSlot(slot: { mentorId: string; createdAt: Date }, invitation: MentorInvitationRecord): boolean {
  return Boolean(
    invitation.acceptedByUserId && invitation.acceptedAt && invitation.publishDueAt &&
    slot.mentorId === invitation.acceptedByUserId &&
    slot.createdAt.getTime() >= invitation.acceptedAt.getTime() &&
    slot.createdAt.getTime() <= invitation.publishDueAt.getTime(),
  );
}

function toRow(invitation: MentorInvitationRecord, status: MentorInvitationStatus, displayName: string | null): MentorInvitationRowDto {
  return {
    id: invitation.id,
    email: invitation.email,
    displayName,
    acceptedByUserId: invitation.acceptedByUserId ?? null,
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
    publishDueAt: invitation.publishDueAt?.toISOString() ?? null,
    stackTags: parseStackTags(invitation.stackTags),
    status,
  };
}

export class MentorInvitationService {
  private readonly dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    this.dependencies = dependencies;
  }

  async list(session: Session): Promise<InvitationBatchesDto> {
    requireOperator(session);
    const [batches, invitations, slotIndex] = await this.loadRows();
    const stopped = this.isStopped(batches, invitations, slotIndex);
    const rows = await this.rows(invitations, slotIndex);
    const batchDtos = batches.map((batch) => {
      const batchRows = rows.filter((row) => invitations.find((item) => item.id === row.id)?.batchId === batch.id);
      return {
        id: batch.id,
        number: batch.number,
        state: stopped ? 'Stopped' as const : batch.closedAt ? 'Full' as const : 'Open' as const,
        openedAt: batch.openedAt.toISOString(),
        sent: batchRows.length,
        accepted: batchRows.filter((row) => row.acceptedAt !== null).length,
        published: batchRows.filter((row) => row.status === 'Published a slot').length,
        invitations: batchRows,
      };
    });
    return {
      batches: batchDtos,
      stopped,
      preBatchInvitations: rows.filter((row) => invitations.find((item) => item.id === row.id)?.batchId == null),
    };
  }

  async openBatch(session: Session): Promise<{ id: string; number: number; openedAt: string }> {
    requireOperator(session);
    return this.dependencies.unitOfWork.run(async () => {
      await this.dependencies.invitationBatchRepository.lockWorkflow();
      await this.assertNotStopped();
      if (await this.dependencies.invitationBatchRepository.findOpen()) {
        throw new ConflictError(BATCH_ALREADY_OPEN_MESSAGE);
      }
      const latest = await this.dependencies.invitationBatchRepository.findLatest();
      const openedAt = this.dependencies.clock.now();
      const batch = await this.dependencies.invitationBatchRepository.create({
        number: (latest?.number ?? 0) + 1,
        openedBy: session.userId,
        openedAt,
        closedAt: null,
        resumedAt: null,
        resumedBy: null,
      });
      return { id: batch.id, number: batch.number, openedAt: batch.openedAt.toISOString() };
    });
  }

  async create(session: Session, input: MentorInvitationCreateInput): Promise<CreatedMentorInvitationDto> {
    requireOperator(session);
    try {
      return await this.dependencies.unitOfWork.run(async () => {
        await this.dependencies.invitationBatchRepository.lockWorkflow();
        await this.assertNotStopped();
        const batch = await this.dependencies.invitationBatchRepository.findOpen();
        if (!batch) {
          if (!(await this.dependencies.invitationBatchRepository.findLatest())) throw new ConflictError(NO_BATCH_OPEN_MESSAGE);
          throw new ConflictError(BATCH_FULL_MESSAGE);
        }

        const allInvitations = await this.dependencies.mentorInvitationRepository.findAll();
        const sent = allInvitations.filter((invitation) => invitation.batchId === batch.id).length;
        if (sent >= INVITATION_BATCH_SIZE) {
          await this.dependencies.invitationBatchRepository.close(batch.id, this.dependencies.clock.now());
          throw new ConflictError(BATCH_FULL_MESSAGE);
        }

        const email = normalizeEmail(input.email);
        const now = this.dependencies.clock.now();
        if (await this.dependencies.mentorInvitationRepository.findUnresolvedByEmail(email, now)) {
          throw new AppError(UNRESOLVED_INVITATION_MESSAGE, 'conflict', 409, { email: [UNRESOLVED_INVITATION_MESSAGE] });
        }

        const user = await this.dependencies.userRepository.findByEmail(email);
        if (user && await this.dependencies.invitationService.isAcceptedMentor(user.id)) {
          throw new AppError(EXISTING_MENTOR_MESSAGE, 'conflict', 409, { email: [EXISTING_MENTOR_MESSAGE] });
        }

        const existingAccess = await this.dependencies.invitationRepository.findByEmail(email);
        if (existingAccess?.revokedAt) {
          throw new AppError('The existing pilot invitation has been revoked.', 'conflict', 409, { email: ['The existing pilot invitation has been revoked.'] });
        }
        const accessInvitation = existingAccess ?? await this.dependencies.invitationService.invite({
          email,
          displayName: user?.name ?? email,
          role: 'mentor',
          invitedBy: session.userId,
        });
        const linkToken = await this.dependencies.magicLinkService.issue(email, ACCOUNT_LOGIN_LINK_TTL_MS);
        if (!linkToken) throw new ConflictError('The invitation could not be prepared.');

        const expiresAt = linkToken.expiresAt;
        const invitation = await this.dependencies.mentorInvitationRepository.create({
          email,
          displayName: user?.name ?? accessInvitation.displayName,
          stackTags: JSON.stringify(input.stackTags),
          batchId: batch.id,
          accessInvitationId: accessInvitation.id,
          acceptedByUserId: null,
          acceptedAt: null,
          expiresAt,
          publishDueAt: null,
          revokedAt: null,
        });
        const url = new URL('/auth/verify', this.dependencies.appBaseUrl());
        url.searchParams.set('token', linkToken.token);
        try {
          await this.dependencies.mailer.send({
            to: email,
            template: 'mentor-invitation',
            data: {
              url: url.toString(),
              expiresAt: expiresAt.toISOString(),
              displayName: user?.name ?? accessInvitation.displayName,
            },
          });
        } catch {
          throw new MailRejectedSignal();
        }

        if (sent + 1 === INVITATION_BATCH_SIZE) {
          await this.dependencies.invitationBatchRepository.close(batch.id, now);
        }
        return {
          id: invitation.id,
          email: invitation.email,
          stackTags: [...input.stackTags],
          batchNumber: batch.number,
          expiresAt: invitation.expiresAt.toISOString(),
        };
      });
    } catch (error) {
      if (error instanceof MailRejectedSignal) {
        throw new AppError(INVITATION_MAIL_FAILURE_MESSAGE, 'mail_delivery_failed', 503);
      }
      throw error;
    }
  }

  async recordAcceptance(email: string, userId: string, acceptedAt: Date): Promise<boolean> {
    const normalized = normalizeEmail(email);
    const publishDueAt = new Date(acceptedAt.getTime() + this.dependencies.publishWindowDays() * DAY_MS);
    return this.dependencies.mentorInvitationRepository.acceptLatest(normalized, userId, acceptedAt, publishDueAt);
  }

  private async assertNotStopped(): Promise<void> {
    const [batches, invitations, slotIndex] = await this.loadRows();
    if (this.isStopped(batches, invitations, slotIndex)) throw new ConflictError(INVITATION_STOP_MESSAGE);
  }

  private async loadRows(): Promise<[
    InvitationBatchRecord[],
    MentorInvitationRecord[],
    Map<string, Array<{ mentorId: string; createdAt: Date }>>,
  ]> {
    const [batches, invitations] = await Promise.all([
      this.dependencies.invitationBatchRepository.findAll(),
      this.dependencies.mentorInvitationRepository.findAll(),
    ]);
    const accepted = invitations.filter((invitation) => invitation.acceptedAt && invitation.publishDueAt && invitation.acceptedByUserId);
    if (!accepted.length) return [batches, invitations, new Map()];
    const mentorIds = [...new Set(accepted.map((invitation) => invitation.acceptedByUserId!))];
    const starts = accepted.map((invitation) => invitation.acceptedAt!.getTime());
    const ends = accepted.map((invitation) => invitation.publishDueAt!.getTime());
    const slots = await this.dependencies.availabilitySlotRepository.findCreatedInRangeForMentors(
      mentorIds,
      new Date(Math.min(...starts)),
      new Date(Math.max(...ends)),
    );
    const slotIndex = new Map<string, Array<{ mentorId: string; createdAt: Date }>>();
    for (const slot of slots) {
      const list = slotIndex.get(slot.mentorId) ?? [];
      list.push({ mentorId: slot.mentorId, createdAt: slot.createdAt });
      slotIndex.set(slot.mentorId, list);
    }
    return [batches, invitations, slotIndex];
  }

  private isStopped(
    batches: InvitationBatchRecord[],
    invitations: MentorInvitationRecord[],
    slotIndex: Map<string, Array<{ mentorId: string; createdAt: Date }>>,
  ): boolean {
    const firstBatch = batches.find((batch) => batch.number === 1);
    if (!firstBatch || firstBatch.resumedAt) return false;
    const firstRows = invitations.filter((invitation) => invitation.batchId === firstBatch.id);
    if (firstRows.length < INVITATION_BATCH_SIZE) return false;
    const now = this.dependencies.clock.now();
    const statuses = firstRows.map((invitation) => this.status(invitation, now, slotIndex));
    if (statuses.some((status) => status === 'Waiting for acceptance' || status === 'Accepted, no slot yet')) return false;
    return statuses.filter((status) => status === 'Published a slot').length < 5;
  }

  private async rows(
    invitations: MentorInvitationRecord[],
    slotIndex: Map<string, Array<{ mentorId: string; createdAt: Date }>>,
  ): Promise<MentorInvitationRowDto[]> {
    const userIds = [...new Set(invitations.flatMap((invitation) => invitation.acceptedByUserId ? [invitation.acceptedByUserId] : []))];
    const users = await Promise.all(userIds.map((id) => this.dependencies.userRepository.findById(id)));
    const names = new Map(userIds.map((id, index) => [id, users[index]?.name || null]));
    const now = this.dependencies.clock.now();
    return invitations.map((invitation) => {
      return toRow(
        invitation,
        this.status(invitation, now, slotIndex),
        invitation.acceptedByUserId ? names.get(invitation.acceptedByUserId) ?? 'Name not available' : null,
      );
    });
  }

  private status(
    invitation: MentorInvitationRecord,
    now: Date,
    slotIndex: Map<string, Array<{ mentorId: string; createdAt: Date }>>,
  ): MentorInvitationStatus {
    const slots = invitation.acceptedByUserId ? slotIndex.get(invitation.acceptedByUserId) ?? [] : [];
    const hasPublishedSlot = slots.some((slot) => isQualifyingSlot(slot, invitation));
    return resolveMentorInvitationStatus({
      now,
      revokedAt: invitation.revokedAt ?? null,
      acceptedAt: invitation.acceptedAt ?? null,
      expiresAt: invitation.expiresAt,
      publishDueAt: invitation.publishDueAt ?? null,
      hasPublishedSlot,
    });
  }
}
