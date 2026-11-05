/**
 * Every domain event, keyed by `concept.entity.action` (past tense). Payloads carry IDs, not
 * personal data, so a subscriber that logs them cannot leak any.
 */
export interface EventMap {
  'auth.user.registered': { userId: string };
  'articles.article.created': { articleId: string; authorId: string };
  'articles.article.updated': { articleId: string; authorId: string };
  'articles.article.deleted': { articleId: string; authorId: string };
  'approvals.approval.requested': { approvalId: string };
  'approvals.approval.approved': { approvalId: string };
  'approvals.approval.rejected': { approvalId: string };
}

export type EventName = keyof EventMap;
