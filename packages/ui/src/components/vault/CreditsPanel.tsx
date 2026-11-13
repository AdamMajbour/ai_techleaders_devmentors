import { EmptyState } from '../../backend/feedback/EmptyState';
import { ErrorMessage } from '../../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../../backend/feedback/LoadingMessage';
import { formatDate, formatPrice } from '../../lib/format';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export interface CreditEntry {
  id: string;
  /** The date of the answer. Never the question or the text. */
  date: string;
  amountMinor: number;
  /** Credits from test payments are listed but never counted in the balance. */
  livemode: boolean;
}

export interface CreditsPanelProps {
  balanceMinor: number;
  testBalanceMinor?: number;
  currency: string;
  entries: CreditEntry[];
  status?: 'ready' | 'loading' | 'error';
  onRetry?: () => void;
  timeZone?: string;
}

// What the mentor earned from vault answers that cited their notes. It is a ledger of credits and no payout:
// the line under the balance says so (vault spec, credits panel).
export function CreditsPanel({ balanceMinor, testBalanceMinor = 0, currency, entries, status = 'ready', onRetry, timeZone }: CreditsPanelProps) {
  return (
    <section aria-label="Credits" className="flex flex-col gap-between-groups">
      <h2 className="m-0 text-section-title font-strong text-headline">Your credits</h2>
      {status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-group">
          <LoadingMessage message="Loading your credits…" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}
      {status === 'error' ? <ErrorMessage message="Your credits could not be loaded. Check your connection and try again." onRetry={onRetry} /> : null}
      {status === 'ready' ? (
        <>
          <div className="flex flex-col gap-group">
            <p className="m-0 text-body text-foreground">
              Balance <span className="font-strong tabular-nums text-headline">{formatPrice(balanceMinor, currency, 'exact')}</span>
            </p>
            {testBalanceMinor > 0 ? (
              <p className="m-0 text-label text-muted-foreground">
                Test credits, not counted: <span className="tabular-nums">{formatPrice(testBalanceMinor, currency, 'exact')}</span>
              </p>
            ) : null}
            <p className="m-0 text-label text-muted-foreground">Not paid out yet. Payout is arranged separately.</p>
          </div>
          {entries.length === 0 ? (
            <EmptyState title="No credits yet" description="You earn a share when a vault answer that cites your note is released." />
          ) : (
            <Table>
              <TableCaption className="sr-only">Credits by answer</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date, timeZone)}</TableCell>
                    <TableCell>{entry.livemode ? 'Credit' : 'Test credit'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(entry.amountMinor, currency, 'exact')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      ) : null}
    </section>
  );
}
