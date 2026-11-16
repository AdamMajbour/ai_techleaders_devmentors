import type {
  BookingRepository,
  Message,
  MessageCursor,
  MessageRepository,
  UserRepository,
} from '@devmentor/db';
import { z } from 'zod';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../http/errors';
import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../security/session';
import type { Clock } from '../../utils/clock';
import { parseOrThrow } from '../../validators/parse';
import { messageBodySchema } from '../../validators/messages/message.schema';

const MESSAGE_PAGE_SIZE = 50;
const cursorPayloadSchema = z.object({ createdAt: z.string().datetime(), id: z.string().uuid() });

function encodeMessageCursor(cursor: MessageCursor): string {
  return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }), 'utf8')
    .toString('base64url');
}

function decodeMessageCursor(value: string): MessageCursor {
  try {
    if (!value || value.length > 512) throw new Error('Invalid cursor length.');
    const payload = cursorPayloadSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    return { createdAt: new Date(payload.createdAt), id: payload.id };
  } catch {
    throw new ValidationError('The message cursor is invalid.');
  }
}

export interface MessageDto {
  id: string;
  authorId: string;
  authorName: string;
  sentAt: string;
  text: string;
}

export interface MessagePage {
  items: MessageDto[];
  nextCursor: string | null;
  pollCursor: string | null;
  serverTime: string;
  session: { startsAt: string; endsAt: string };
  viewerId: string;
}

type Dependencies = {
  bookingRepository: Pick<BookingRepository, 'findById'>;
  messageRepository: Pick<MessageRepository, 'create' | 'findByBookingAfter'>;
  userRepository: Pick<UserRepository, 'findById'>;
  eventBus: EventBus;
  clock: Clock;
};

function cursorFromMessage(message: Message): MessageCursor {
  return { createdAt: message.createdAt, id: message.id };
}

export class MessageService {
  private readonly bookingRepository: Dependencies['bookingRepository'];
  private readonly messageRepository: Dependencies['messageRepository'];
  private readonly userRepository: Dependencies['userRepository'];
  private readonly eventBus: EventBus;
  private readonly clock: Clock;

  constructor({ bookingRepository, messageRepository, userRepository, eventBus, clock }: Dependencies) {
    this.bookingRepository = bookingRepository;
    this.messageRepository = messageRepository;
    this.userRepository = userRepository;
    this.eventBus = eventBus;
    this.clock = clock;
  }

  async list(session: Session, bookingId: string, cursor?: string): Promise<MessagePage> {
    const booking = await this.requireAcceptedParticipant(session, bookingId);
    const after = cursor ? decodeMessageCursor(cursor) : null;
    const rows = await this.messageRepository.findByBookingAfter(booking.id, after, MESSAGE_PAGE_SIZE + 1);
    const hasMore = rows.length > MESSAGE_PAGE_SIZE;
    const messages = hasMore ? rows.slice(0, MESSAGE_PAGE_SIZE) : rows;
    const items = await Promise.all(messages.map((message) => this.toDto(message)));
    return {
      items,
      nextCursor: hasMore && messages.length > 0
        ? encodeMessageCursor(cursorFromMessage(messages[messages.length - 1]))
        : null,
      pollCursor: messages.length > 0
        ? encodeMessageCursor(cursorFromMessage(messages[messages.length - 1]))
        : cursor ?? null,
      serverTime: this.clock.now().toISOString(),
      session: { startsAt: booking.startsAt!.toISOString(), endsAt: booking.endsAt!.toISOString() },
      viewerId: session.userId,
    };
  }

  async post(session: Session, bookingId: string, untrustedBody: unknown): Promise<MessageDto> {
    const body = parseOrThrow(messageBodySchema, untrustedBody);
    const booking = await this.requireAcceptedParticipant(session, bookingId);
    const now = this.clock.now();
    if (!booking.startsAt || !booking.endsAt || now < booking.startsAt || now >= booking.endsAt) {
      throw new ConflictError('Messages can only be sent during the accepted session.');
    }

    const message = await this.messageRepository.create({
      bookingId: booking.id,
      authorId: session.userId,
      body,
    });
    await this.eventBus.emit('messages.message.posted', {
      messageId: message.id,
      bookingId: booking.id,
      authorId: session.userId,
    });
    return this.toDto(message);
  }

  private async requireAcceptedParticipant(session: Session, bookingId: string) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundError();
    if (![booking.seekerId, booking.mentorId].includes(session.userId)) throw new ForbiddenError();
    if (booking.status !== 'accepted' || !booking.startsAt || !booking.endsAt) throw new NotFoundError();
    return booking;
  }

  private async toDto(message: Message): Promise<MessageDto> {
    const author = await this.userRepository.findById(message.authorId);
    if (!author) throw new NotFoundError();
    return {
      id: message.id,
      authorId: message.authorId,
      authorName: author.name,
      sentAt: message.createdAt.toISOString(),
      text: message.body,
    };
  }
}
