/** Runs database work inside one transaction. Implementations live in the DB adapter. */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
