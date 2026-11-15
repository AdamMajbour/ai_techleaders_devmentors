import '../../db/src/load-env';
import { closeORM } from '@devmentor/db';
import { getContainer } from '../src/container/container';

const HELP = `Usage:
  npm run bookings:settle
  npm run bookings:settle -- --help

Expires only paid bookings whose mentor response window has elapsed and opens
operator-only refund approvals. It never executes refunds; safe to run on a schedule.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(HELP);
    return;
  }
  if (args.length > 0) {
    console.error('Unknown arguments. Run `npm run bookings:settle -- --help` for usage.');
    process.exitCode = 1;
    return;
  }

  try {
    const container = await getContainer();
    const { bookingService } = container.createScope().cradle;
    const expired = await bookingService.settleExpired();
    console.log(`Settlement complete. Expired ${expired} booking(s); refunds were not executed.`);
  } catch {
    console.error('Unable to settle bookings. Check database connectivity and booking configuration.');
    process.exitCode = 1;
  } finally {
    await closeORM();
  }
}

void main();
