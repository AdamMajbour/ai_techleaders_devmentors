import '../../db/src/load-env';
import { closeORM } from '@devmentor/db';
import { getContainer } from '../src/container/container';

const HELP = `Usage:
  npm run vault:settle
  npm run vault:settle -- --include-ai

Expires overdue mentor previews and creates refund approvals (it never executes refunds).
Pass --include-ai on a scheduler with an explicit AI budget to also run generation.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0] ?? '')) { console.log(HELP); return; }
  if (args.some((arg) => arg !== '--include-ai')) {
    console.error('Unknown arguments. Run `npm run vault:settle -- --help` for usage.');
    process.exitCode = 1;
    return;
  }
  try {
    const cradle = (await getContainer()).createScope().cradle;
    const tasks = [cradle.vaultExpireReviewsTask, ...(args.includes('--include-ai') ? [cradle.vaultGenerationTask] : [])];
    const counts: string[] = [];
    for (const task of tasks) counts.push(`${task.name}: ${(await task.run({ limit: 20 })).processed}`);
    console.log(`Vault settlement complete. ${counts.join(', ')}. Refunds are approvals only.`);
  } catch {
    console.error('Unable to settle vault work. Check database connectivity and vault configuration.');
    process.exitCode = 1;
  } finally {
    await closeORM();
  }
}

void main();
