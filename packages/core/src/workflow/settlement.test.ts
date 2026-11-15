import { createSettleOnRead, SettlementRunner, type SettlementTask } from './settlement';

describe('SettlementRunner', () => {
  it('continues after a failed task and keeps external tasks out of settle-on-read', async () => {
    const dbTask: SettlementTask = { name: 'expire', taskClass: 'db', run: jest.fn().mockResolvedValue({ processed: 2 }) };
    const failedTask: SettlementTask = { name: 'bad', taskClass: 'db', run: jest.fn().mockRejectedValue(new Error('failure')) };
    const externalTask: SettlementTask = { name: 'generate', taskClass: 'external', run: jest.fn().mockResolvedValue({ processed: 1 }) };
    const logger = { error: jest.fn() };
    const runner = new SettlementRunner([failedTask, dbTask, externalTask], logger);
    const settleOnRead = createSettleOnRead(runner, [failedTask, dbTask, externalTask]);

    await expect(settleOnRead()).resolves.toEqual({ counts: { bad: 0, expire: 2 } });
    expect(externalTask.run).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('throttles each read task independently', async () => {
    let now = 100;
    const task: SettlementTask = { name: 'expire', taskClass: 'db', run: jest.fn().mockResolvedValue({ processed: 1 }) };
    const runner = new SettlementRunner([task], { error: jest.fn() });
    const settleOnRead = createSettleOnRead(runner, [task], { throttleMs: 10, now: () => now });

    await settleOnRead();
    await settleOnRead();
    now += 10;
    await settleOnRead();
    expect(task.run).toHaveBeenCalledTimes(2);
  });
});
