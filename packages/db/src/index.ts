// Database package - re-export entities, repositories, and config
// Server-only: do not import from client components.
export * from './config';
export * from './entities';
export * from './repositories';
// The only ORM type other packages may name; they never import @mikro-orm/* themselves.
export type { EntityManager } from '@mikro-orm/core';
