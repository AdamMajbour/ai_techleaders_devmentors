import { PILOT_RETENTION_DEADLINE, RetentionSweepTask } from './retention-sweep.task';

function setup(now: Date) {
  const erasePilotContent = jest.fn(async (limit: number) => ({ messages: limit, bookingQuestions: 0, notes: 0, vaultQuestions: 0, vaultAnswers: 0, citations: 0, skippedHolds: 0 }));
  const startSweepRun = jest.fn(async () => 'run-id');
  const finishSweepRun = jest.fn(async () => undefined);
  const run = jest.fn(async (work: () => Promise<unknown>) => work());
  const task = new RetentionSweepTask({
    retentionRepository: { erasePilotContent, startSweepRun, finishSweepRun } as never,
    unitOfWork: { run } as never,
    clock: { now: () => now },
  });
  return { task, erasePilotContent, startSweepRun, finishSweepRun, run };
}

describe('RetentionSweepTask', () => {
  it('does nothing before the published retention boundary', async () => {
    const { task, erasePilotContent, startSweepRun } = setup(new Date(PILOT_RETENTION_DEADLINE.getTime() - 1));
    await expect(task.run({ limit: 25 })).resolves.toMatchObject({ processed: 0 });
    expect(erasePilotContent).not.toHaveBeenCalled();
    expect(startSweepRun).not.toHaveBeenCalled();
  });

  it('starts an idempotent bounded sweep at the boundary', async () => {
    const { task, erasePilotContent, run, startSweepRun, finishSweepRun } = setup(PILOT_RETENTION_DEADLINE);
    await expect(task.run({ limit: 25 })).resolves.toMatchObject({ processed: 25 });
    expect(run).toHaveBeenCalledTimes(1);
    expect(erasePilotContent).toHaveBeenCalledWith(25);
    expect(startSweepRun).toHaveBeenCalledWith(expect.objectContaining({ limitCount: 25 }));
    expect(finishSweepRun).toHaveBeenCalledWith(expect.objectContaining({ id: 'run-id', status: 'completed', processedCount: 25 }));
  });
});
