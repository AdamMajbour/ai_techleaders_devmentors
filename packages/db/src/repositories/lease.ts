import type { EntityManager } from '@mikro-orm/core';

export interface LeasePredicate {
  readonly property: string;
  readonly equals?: string | number | boolean | null;
  readonly in?: readonly (string | number | boolean | null)[];
}

export interface ClaimLeaseInput {
  readonly entity: string;
  readonly id: string;
  readonly leaseColumn: string;
  readonly attemptsColumn: string;
  readonly leaseMs: number;
  readonly now: Date;
  readonly where?: LeasePredicate;
}

export interface ReleaseLeaseInput {
  readonly entity: string;
  readonly id: string;
  readonly leaseColumn: string;
  readonly retryAfterMs: number;
  readonly leaseMs: number;
  readonly now: Date;
}

interface EntityMetadata {
  readonly className: string;
  readonly name: string;
  readonly collection: string;
  readonly properties: Record<string, { fieldNames?: string[] }>;
}

function findMetadata(em: EntityManager, entity: string): EntityMetadata {
  const target = Object.values(em.getMetadata().getAll()).find((item) => {
    const meta = item as EntityMetadata;
    return [meta.className, meta.name, meta.collection].some((name) => name?.toLowerCase() === entity.toLowerCase());
  }) as EntityMetadata | undefined;
  if (!target) throw new TypeError(`Unknown lease entity: ${entity}`);
  return target;
}

function column(em: EntityManager, metadata: EntityMetadata, property: string): string {
  const name = metadata.properties[property]?.fieldNames?.[0];
  if (!name) throw new TypeError(`Unknown lease property: ${property}`);
  return em.getPlatform().quoteIdentifier(name);
}

/** Atomically claims a row lease and increments attempts without changing lifecycle fields. */
export async function claimLease(em: EntityManager, input: ClaimLeaseInput): Promise<boolean> {
  if (input.leaseMs < 0) throw new RangeError('leaseMs must be non-negative.');
  const metadata = findMetadata(em, input.entity);
  const quote = (name: string) => em.getPlatform().quoteIdentifier(name);
  const predicates = [
    `(${column(em, metadata, input.leaseColumn)} is null or ${column(em, metadata, input.leaseColumn)} < ?)`,
  ];
  const values: unknown[] = [new Date(input.now.getTime() - input.leaseMs)];
  if (input.where) {
    const whereColumn = column(em, metadata, input.where.property);
    if (input.where.in) {
      if (input.where.in.length === 0) return false;
      predicates.push(`${whereColumn} in (${input.where.in.map(() => '?').join(', ')})`);
      values.push(...input.where.in);
    } else {
      predicates.push(`${whereColumn} is not distinct from ?`);
      values.push(input.where.equals ?? null);
    }
  }
  const rows = await em.getConnection().execute<Array<{ id: string }>>(
    `update ${quote(metadata.collection)} set ${column(em, metadata, input.leaseColumn)} = ?, ${column(em, metadata, input.attemptsColumn)} = ${column(em, metadata, input.attemptsColumn)} + 1 where ${column(em, metadata, 'id')} = ? and ${predicates.join(' and ')} returning ${column(em, metadata, 'id')}`,
    [input.now, input.id, ...values],
    'all',
    em.getTransactionContext(),
  );
  return Array.isArray(rows) && rows.length === 1;
}

/** Moves the lease cutoff so a failed attempt may be retried after the requested back-off. */
export async function releaseLease(em: EntityManager, input: ReleaseLeaseInput): Promise<boolean> {
  if (input.retryAfterMs < 0 || input.leaseMs < 0) throw new RangeError('Lease delays must be non-negative.');
  const metadata = findMetadata(em, input.entity);
  const rows = await em.getConnection().execute<Array<{ id: string }>>(
    `update ${em.getPlatform().quoteIdentifier(metadata.collection)} set ${column(em, metadata, input.leaseColumn)} = ?, ${column(em, metadata, 'updatedAt')} = ? where ${column(em, metadata, 'id')} = ? returning ${column(em, metadata, 'id')}`,
    [new Date(input.now.getTime() + input.retryAfterMs - input.leaseMs), input.now, input.id],
    'all',
    em.getTransactionContext(),
  );
  return Array.isArray(rows) && rows.length === 1;
}
