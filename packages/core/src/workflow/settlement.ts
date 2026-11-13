export type SettlementTaskClass = 'db' | 'external';

export interface SettlementTask {
  readonly name: string;
  readonly taskClass: SettlementTaskClass;
  run(context: { limit: number }): Promise<{ processed: number }>;
}

export interface SettlementLogger {
  error(message: string, context?: Record<string, unknown>): void;
}

export interface SettlementResult {
  readonly counts: Readonly<Record<string, number>>;
}

/** Runs registered work in order; an individual task failure never prevents later tasks. */
export class SettlementRunner {
  constructor(
    private readonly tasks: readonly SettlementTask[],
    private readonly logger: SettlementLogger,
  ) {}

  async runDue(options: { only?: readonly string[]; limit?: number } = {}): Promise<SettlementResult> {
    const selected = options.only ? new Set(options.only) : null;
    const counts: Record<string, number> = {};
    for (const task of this.tasks) {
      if (selected && !selected.has(task.name)) continue;
      try {
        const result = await task.run({ limit: options.limit ?? 20 });
        counts[task.name] = result.processed;
      } catch (error) {
        this.logger.error('Settlement task failed.', {
          task: task.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        counts[task.name] = 0;
      }
    }
    return { counts };
  }
}

/** In-process throttle for read-triggered DB-only settlement tasks. */
export function createSettleOnRead(
  runner: SettlementRunner,
  tasks: readonly SettlementTask[],
  options: { throttleMs?: number; now?: () => number } = {},
): (names?: readonly string[]) => Promise<SettlementResult> {
  const allowed = new Set(tasks.filter((task) => task.taskClass === 'db').map((task) => task.name));
  const lastRun = new Map<string, number>();
  const throttleMs = options.throttleMs ?? 10_000;
  const now = options.now ?? Date.now;
  return async (names) => {
    const due = (names ?? [...allowed]).filter((name) => {
      if (!allowed.has(name)) return false;
      const previous = lastRun.get(name) ?? Number.NEGATIVE_INFINITY;
      if (now() - previous < throttleMs) return false;
      lastRun.set(name, now());
      return true;
    });
    return runner.runDue({ only: due });
  };
}
