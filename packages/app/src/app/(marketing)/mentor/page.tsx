import Link from 'next/link';
import { Button, TextLink } from '@devmentor/ui';
import { requirePanelAccess } from '../../../lib/panel-access';

export const metadata = { title: 'Mentor workspace' };

export default async function MentorWorkspacePage() {
  await requirePanelAccess('mentor');

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-wrap items-start justify-between gap-group">
        <div className="flex flex-col gap-group">
          <h1 className="m-0 text-page-title font-strong text-headline">Mentor workspace</h1>
          <p className="m-0 text-body text-muted-foreground">
            Review questions from seekers and keep your mentor profile up to date.
          </p>
        </div>
      </header>

      <section aria-labelledby="bookings-heading" className="flex flex-col gap-group border-b border-border py-section">
        <h2 id="bookings-heading" className="m-0 text-section-title font-strong text-headline">Bookings</h2>
        <p className="m-0 text-body text-muted-foreground">
          Review paid questions, then accept or decline each session request.
        </p>
        <div>
          <Button asChild>
            <Link href="/mentor/bookings">Open bookings</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="profile-heading" className="flex flex-col gap-group py-section">
        <h2 id="profile-heading" className="m-0 text-section-title font-strong text-headline">Mentor profile</h2>
        <p className="m-0 text-body text-muted-foreground">
          Update your experience, technologies and public work so seekers know what you can help with.
        </p>
        <div>
          <TextLink asChild>
            <Link href="/mentor/profile">Edit mentor profile</Link>
          </TextLink>
        </div>
      </section>
    </main>
  );
}
