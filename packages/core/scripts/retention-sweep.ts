import '../../db/src/load-env';
import { closeORM } from '@devmentor/db';
import { getContainer } from '../src/container/container';

async function main(): Promise<void> {
  try {
    const task = (await getContainer()).createScope().cradle.retentionSweepTask;
    const limit = 100;
    let result = await task.run({ limit });
    do {
      console.log(`Retention sweep processed ${result.processed} content records.`, result.deleted);
      const hasFullBatch = Object.entries(result.deleted).some(([category, count]) => category !== 'skippedHolds' && count >= limit);
      if (!hasFullBatch) break;
      result = await task.run({ limit });
    } while (true);
  } catch {
    console.error('Unable to run the pilot retention sweep. Check database connectivity.');
    process.exitCode = 1;
  } finally {
    await closeORM();
  }
}

void main();
