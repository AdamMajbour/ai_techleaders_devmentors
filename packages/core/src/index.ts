// Core package, isomorphic entry: types, utilities, constants, typed errors and shared Zod schemas.
// Safe to import from anywhere (also client code). It never imports next, react or the ORM.
// Server-only pieces (DI container, services, API handler) live in `@devmentor/core/server`.
export * from './types';
export * from './utils';
export * from './constants';
export * from './http/errors';
export type { ApiEnvelope } from './http/envelope';
export * from './validators/parse';
export * from './validators/articles/article-list.schema';
