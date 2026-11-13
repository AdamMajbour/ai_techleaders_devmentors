import type { Article, User } from '@devmentor/db';

/** What leaves the core package. Entities never do, so a password hash cannot reach a response. */
export type UserDto = { id: string; email: string; name: string; avatar: string | null; createdAt: string };

export type ArticleDto = { id: string; title: string; content: string; authorId: string; createdAt: string; updatedAt: string };

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

export type SessionNoteDto = {
  id: string;
  bookingId: string;
  mentorId: string;
  seekerId: string;
  title: string;
  content: string;
  seekerApprovedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toSessionNoteDto(note: import('@devmentor/db').SessionNote): SessionNoteDto {
  return {
    id: note.id,
    bookingId: note.bookingId,
    mentorId: note.mentorId,
    seekerId: note.seekerId,
    title: note.title,
    content: note.content,
    seekerApprovedAt: note.seekerApprovedAt?.toISOString() ?? null,
    withdrawnAt: note.withdrawnAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
