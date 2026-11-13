import { EmptyState } from '../../backend/feedback/EmptyState';
import { ErrorMessage } from '../../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../../backend/feedback/LoadingMessage';
import { formatClock, formatDate } from '../../lib/format';
import { Skeleton } from '../ui/skeleton';
import { StatusBadge } from '../ui/status-badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

/** `open`: the window of the criterion has not ended. `triggered`: the stop-or-revise condition is met. `clear`: it is not. */
export type PilotTrigger = 'open' | 'triggered' | 'clear';

export interface PilotCountRow {
  id: string;
  /** The criterion in words: "People who prepaid a 25-minute session". */
  criterion: string;
  /** The measured value with its unit: "3 people", "74 min". */
  value: string;
  /** The provisional threshold of the decision record, as a condition: "fewer than 5 people within 4 weeks". */
  threshold: string;
  /** The date of the review at which the founders read the number. */
  reviewDate: string;
}

export interface PilotCountsTableProps {
  rows: (PilotCountRow & { trigger: PilotTrigger })[];
  /** When the numbers were computed. */
  asOf?: string;
  status?: 'ready' | 'loading' | 'error';
  onRetry?: () => void;
  timeZone?: string;
}

const TRIGGER: Record<PilotTrigger, { tone: 'neutral' | 'danger'; text: string }> = {
  open: { tone: 'neutral', text: 'Window still open' },
  triggered: { tone: 'danger', text: 'Stop-or-revise condition met' },
  clear: { tone: 'neutral', text: 'Condition not met' },
};

export function pilotTriggerLabel(trigger: PilotTrigger) {
  return TRIGGER[trigger];
}

// The numbers the founders read at the two reviews (E03-S03). The table states the facts and the condition of the
// decision record next to each number; whether to stop or revise is the founders' decision, not the table's.
export function PilotCountsTable({ rows, asOf, status = 'ready', onRetry, timeZone }: PilotCountsTableProps) {
  return (
    <section aria-label="Pilot counts" className="flex flex-col gap-between-groups">
      {status === 'loading' ? (
        <div aria-busy="true" className="flex flex-col gap-group">
          <LoadingMessage message="Loading the pilot counts…" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : null}
      {status === 'error' ? <ErrorMessage message="The pilot counts could not be loaded. Check your connection and try again." onRetry={onRetry} /> : null}
      {status === 'ready' ? (
        <>
          {rows.length === 0 ? (
            <EmptyState title="No criteria to show" description="The criteria of the pilot appear here once they are configured." />
          ) : (
            <Table>
              <TableCaption className="sr-only">Pilot criteria, their values and their provisional thresholds</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Criterion</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Provisional threshold</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.criterion}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.value}</TableCell>
                    <TableCell>{row.threshold}</TableCell>
                    <TableCell>{formatDate(row.reviewDate, timeZone)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={TRIGGER[row.trigger].tone}>{TRIGGER[row.trigger].text}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex flex-col gap-group text-label text-muted-foreground">
            <p className="m-0">Counts include live payments only. Test payments are not counted. A vault answer counts when it is released.</p>
            <p className="m-0">The thresholds are provisional targets with no baseline.</p>
            {asOf ? (
              <p className="m-0">
                Counted on {formatDate(asOf, timeZone)} at {formatClock(asOf, timeZone)}.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
