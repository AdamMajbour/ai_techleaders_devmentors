import type { EntityManager } from '@mikro-orm/core';

interface UnitOfWorkPort {
  run<T>(work: () => Promise<T>): Promise<T>;
}

/** Adapts the request-scoped EntityManager to the core transaction port. */
export class MikroOrmUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly em: EntityManager) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.em.isInTransaction()) return work();
    return this.em.transactional(work);
  }
}
