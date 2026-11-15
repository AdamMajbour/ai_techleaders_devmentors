import type { ReactNode } from 'react';

// Documentation helper: a good and a bad example side by side, each with one sentence of reason.
// The marker is text ("Do" / "Don't"), never colour alone (WCAG 1.4.1).
export function DoDont({
  doExample,
  doWhy,
  dontExample,
  dontWhy,
}: {
  doExample: ReactNode;
  doWhy: string;
  dontExample: ReactNode;
  dontWhy: string;
}) {
  const cell = 'flex flex-col gap-group rounded-lg border border-input bg-card p-panel-compact text-card-foreground';
  return (
    <div className="grid gap-between-groups md:grid-cols-2">
      <figure className={`m-0 ${cell}`}>
        <p className="text-label font-strong text-headline">Do</p>
        <div className="flex min-h-12 items-center">{doExample}</div>
        <figcaption className="text-meta text-muted-foreground">{doWhy}</figcaption>
      </figure>
      <figure className={`m-0 ${cell}`}>
        <p className="text-label font-strong text-headline">Don&apos;t</p>
        <div className="flex min-h-12 items-center">{dontExample}</div>
        <figcaption className="text-meta text-muted-foreground">{dontWhy}</figcaption>
      </figure>
    </div>
  );
}
