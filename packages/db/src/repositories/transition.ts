import { randomUUID } from 'node:crypto';
import type { EntityManager } from '@mikro-orm/core';
import { StatusTransitionConflictError } from '../errors';

export type TransitionActor =
  | { kind: 'user'; userId: string }
  | { kind: 'system' | 'webhook'; userId?: string | null };

export interface TransitionStatusInput {
  entityType: string;
  entityId: string;
  from: readonly string[];
  to: string;
  actor: TransitionActor;
  patch?: Record<string, unknown>;
  /** Treat an already-completed transition as a successful no-op. */
  ifAlready?: boolean;
}

interface TargetMetadata {
  className: string;
  name: string;
  collection: string;
  properties: Record<string, { fieldNames?: string[] }>;
}

function findTargetMetadata(em: EntityManager, entityType: string): TargetMetadata {
  const wanted = entityType.toLowerCase();
  const metadata = Object.values(em.getMetadata().getAll()) as TargetMetadata[];
  const target = metadata.find((candidate) =>
    [candidate.className, candidate.name, candidate.collection].some((name) => name.toLowerCase() === wanted),
  );
  if (!target) {
    throw new TypeError(`Unknown transition entity type: ${entityType}`);
  }
  return target;
}

function columnName(em: EntityManager, meta: TargetMetadata, propertyName: string): string {
  const property = meta.properties[propertyName];
  const NamingStrategy = em.getPlatform().getNamingStrategy();
  return property?.fieldNames?.[0] ?? new NamingStrategy().propertyToColumnName(propertyName);
}

async function applyTransition(em: EntityManager, input: TransitionStatusInput): Promise<boolean> {
  const meta = findTargetMetadata(em, input.entityType);
  const platform = em.getPlatform();
  const quote = (identifier: string) => platform.quoteIdentifier(identifier);
  const table = quote(meta.collection);
  const idColumn = quote(columnName(em, meta, 'id'));
  const statusColumn = quote(columnName(em, meta, 'status'));
  const transactionContext = em.getTransactionContext();
  const connection = em.getConnection();

  if (input.from.length === 0) {
    throw new StatusTransitionConflictError();
  }

  const locked = await connection.execute<{ status: string }>(
    `select ${statusColumn} as "status" from ${table} where ${idColumn} = ? and ${statusColumn} in (${input.from.map(() => '?').join(', ')}) for update`,
    [input.entityId, ...input.from],
    'get',
    transactionContext,
  );
  if (!locked) {
    if (input.ifAlready) {
      const current = await connection.execute<{ status: string }>(
        `select ${statusColumn} as "status" from ${table} where ${idColumn} = ?`,
        [input.entityId],
        'get',
        transactionContext,
      );
      if (current?.status === input.to) return false;
    }
    throw new StatusTransitionConflictError();
  }

  const patch = input.patch ?? {};
  if (Object.hasOwn(patch, 'id') || Object.hasOwn(patch, 'status')) {
    throw new TypeError('A transition patch cannot change id or status.');
  }
  const patchEntries = Object.entries(patch);
  const assignments = [
    `${statusColumn} = ?`,
    ...patchEntries.map(([property]) => `${quote(columnName(em, meta, property))} = ?`),
  ];
  const values = [
    input.to,
    ...patchEntries.map(([, value]) => value),
    input.entityId,
    ...input.from,
  ];
  const updated = await connection.execute(
    `update ${table} set ${assignments.join(', ')} where ${idColumn} = ? and ${statusColumn} in (${input.from.map(() => '?').join(', ')}) returning ${idColumn}`,
    values,
    'all',
    transactionContext,
  );
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new StatusTransitionConflictError();
  }

  const now = new Date();
  await connection.execute(
    `insert into "status_transitions" ("id", "entity_type", "entity_id", "from_status", "to_status", "actor_kind", "actor_user_id", "created_at", "updated_at") values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      input.entityType,
      input.entityId,
      locked.status,
      input.to,
      input.actor.kind,
      input.actor.kind === 'user' ? input.actor.userId : input.actor.userId ?? null,
      now,
      now,
    ],
    'run',
    transactionContext,
  );
  return true;
}

/** Performs a conditional status update and its audit insert in one transaction. */
export async function transitionStatus(em: EntityManager, input: TransitionStatusInput): Promise<boolean> {
  if (em.isInTransaction()) {
    return applyTransition(em, input);
  }
  return em.transactional((transactionalEm) => applyTransition(transactionalEm, input));
}
