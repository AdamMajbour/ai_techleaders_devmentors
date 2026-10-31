import { cn } from '../../lib/utils';
import { formatPrice } from '../../lib/format';

export interface PriceNoticeProps {
  amountMinor: number;
  currency: string;
  /** What the price buys: "for a 25-minute text session with a platform engineer". */
  description: string;
  /** When the user is paid back, in plain words. Required: the price and the way out go together (R04). */
  refundRule: string;
  className?: string;
}

// The price is shown before the user writes anything (R04), so it is the first thing in a paid form.
// It is plain text in a bordered panel, not an alert: nothing is wrong, it just has to be seen.
export function PriceNotice({ amountMinor, currency, description, refundRule, className }: PriceNoticeProps) {
  return (
    <section aria-label="Price" className={cn('flex flex-col gap-group rounded-lg border border-input p-panel-compact', className)}>
      <p className="m-0 text-body text-foreground">
        <span className="text-section-title font-strong text-headline tabular-nums">{formatPrice(amountMinor, currency)}</span>{' '}
        {description}
      </p>
      <p className="m-0 text-body text-muted-foreground">{refundRule}</p>
    </section>
  );
}
