import type { Article, Booking, User } from '@devmentor/db';

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
  status: string;
  source: string;
  landedAt: string;
};

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; pageCount: number };

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
    status: booking.status,
    source: booking.source,
    landedAt: booking.landedAt.toISOString(),
  };
}
