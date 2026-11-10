import type { Article, Booking, User } from '@devmentor/db';
import type { BookingStatus } from '../workflow/booking-state-machine';

/** What leaves the core package. Entities never do, so a password hash cannot reach a response. */
export type UserDto = { id: string; email: string; name: string; avatar: string | null; createdAt: string };

export type ArticleDto = { id: string; title: string; content: string; authorId: string; createdAt: string; updatedAt: string };

export type BookingDto = {
  id: string;
  seekerId: string;
  mentorId: string;
  question: string;
  durationMinutes: number;
  priceMinor: number;
  currency: string;
  status: BookingStatus;
  source: 'link' | 'list';
  landedAt: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; pageCount: number };

export type BookingReadDto = Omit<BookingDto, 'question' | 'source' | 'landedAt'> & {
  question?: string;
  source?: 'link' | 'list';
  landedAt?: string;
  counterpartName: string;
  counterpartEmail?: string;
  mentor?: { id: string; slug: string; name: string; headline: string; technologies: string };
  refundStatus: 'none' | 'pending_approval' | 'processing' | 'refunded';
  allowedActions: Array<'reconcile_payment' | 'accept' | 'decline'>;
  serverTime: string;
};

export type BookingPage = Page<BookingReadDto> & { serverTime: string };

export interface RefundApprovalDto {
  approvalId: string;
  paymentId: string;
  bookingId: string | null;
  reason: string;
  status: 'pending' | 'approved';
  createdAt: string;
  paymentStatus: 'succeeded' | 'refund_pending' | 'refunded';
  amountMinor: number;
  currency: string;
  seekerName: string;
  mentorName: string;
  allowedActions: Array<'approve' | 'reject' | 'retry_refund'>;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toArticleDto(article: Article): ArticleDto {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    authorId: article.authorId,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export function toBookingDto(booking: Booking): BookingDto {
  return {
    id: booking.id,
    seekerId: booking.seekerId,
    mentorId: booking.mentorId,
    question: booking.question,
    durationMinutes: booking.durationMinutes,
    priceMinor: booking.priceMinor,
    currency: booking.currency,
    status: booking.status as BookingStatus,
    source: booking.source as BookingDto['source'],
    landedAt: booking.landedAt.toISOString(),
    startsAt: booking.startsAt?.toISOString() ?? null,
    endsAt: booking.endsAt?.toISOString() ?? null,
  };
}
