import Link from 'next/link';
import { Button } from '@devmentor/ui';
import { requirePanelAccess } from '../../../lib/panel-access';

export const metadata = { title: 'My sessions' };

export default async function SeekerDashboardPage() {
  await requirePanelAccess('mentee');

  return (
    <main className="mx-auto flex max-w-content flex-col gap-section">
      <header className="flex flex-col gap-group">
        <h1 className="m-0 text-page-title font-strong text-headline">Mentee home</h1>
        <p className="m-0 max-w-session text-body text-muted-foreground">
          Find a mentor, book time to work through a challenge, and keep your sessions in one place.
        </p>
      </header>
      <section className="flex flex-wrap gap-group" aria-label="Mentee actions">
        <Button asChild><Link href="/mentors">Find a mentor</Link></Button>
        <Button asChild variant="outline"><Link href="/vault">Browse mentor answers</Link></Button>
      </section>
    </main>
  );
}
