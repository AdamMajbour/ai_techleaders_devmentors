import { formatPrice } from '../../lib/format';
import { Button } from '../ui/button';
import { TextLink } from '../ui/text-link';

export type MentorActivity = 'within_hour' | 'today' | 'earlier' | 'never';

export interface MentorRowData {
  id: string;
  name: string;
  /** What the mentor has done, in concrete words: "Upgraded ingress-nginx on bare metal clusters". */
  headline: string;
  technologies: string[];
  /** A link to public work stands in for ratings (N02). */
  publicWork?: { label: string; href: string };
  activity?: MentorActivity;
}

export interface MentorRowProps {
  mentor: MentorRowData;
  priceMinor: number;
  currency: string;
  sessionMinutes?: number;
  /** The mentor's page, where the question is written. */
  href: string;
  /** The heading level of the name. One below the heading of the list, so the outline has no gap (WCAG 1.3.1). */
  headingLevel?: 2 | 3 | 4;
}

const ACTIVITY_TEXT: Record<MentorActivity, string> = {
  within_hour: 'Active within the hour',
  today: 'Active today',
  earlier: 'Active earlier',
  never: 'Not active yet',
};

// One mentor in the list. Render it inside a <ul>. No rating, no score, no badge such as "Top mentor" (N02):
// what is shown is what the mentor did, their public work, the price and when they last acted.
export function MentorRow({ mentor, priceMinor, currency, sessionMinutes = 25, href, headingLevel = 3 }: MentorRowProps) {
  const Heading = `h${headingLevel}` as const;
  const { name, headline, technologies, publicWork, activity } = mentor;
  return (
    <li className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-group">
        <Heading className="m-0 text-body font-strong text-headline">{name}</Heading>
        <p className="m-0 text-body text-foreground">{headline}</p>
        <p className="m-0 text-label text-muted-foreground">{technologies.join(' · ')}</p>
        {publicWork ? (
          <p className="m-0 text-label">
            Public work: <TextLink href={publicWork.href}>{publicWork.label}</TextLink>
          </p>
        ) : null}
        {activity ? (
          <p className="m-0 text-meta text-muted-foreground">
            {ACTIVITY_TEXT[activity]}. Not a promise of reply time.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-group md:items-end">
        <p className="m-0 text-body">
          <span className="font-strong tabular-nums text-headline">{formatPrice(priceMinor, currency)}</span>{' '}
          <span className="text-muted-foreground">for {sessionMinutes} minutes of text</span>
        </p>
        <Button asChild size="sm">
          <a href={href}>
            Ask a question<span className="sr-only"> to {name}</span>
          </a>
        </Button>
      </div>
    </li>
  );
}
