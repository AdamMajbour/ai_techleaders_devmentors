import { randomUUID } from 'node:crypto';
import { p } from '@mikro-orm/core';

/**
 * Columns every table has: a UUID primary key (no enumerable sequential IDs) and timestamps.
 * A function, so every entity gets its own property builders.
 */
export function baseProperties() {
  return {
    id: p.uuid().primary().onCreate(() => randomUUID()),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  };
}
