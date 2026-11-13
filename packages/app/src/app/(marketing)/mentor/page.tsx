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

      <section aria-labelledby="availability-heading" className="flex flex-col gap-group border-b border-border py-section">
        <h2 id="availability-heading" className="m-0 text-section-title font-strong text-headline">Session availability</h2>
        <p className="m-0 text-body text-muted-foreground">Publish the 25-minute times seekers can reserve from your profile.</p>
        <div><Button asChild><Link href="/mentor/availability">Manage available times</Link></Button></div>
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

      <section aria-labelledby="notes-heading" className="flex flex-col gap-group border-t border-border py-section">
        <h2 id="notes-heading" className="m-0 text-section-title font-strong text-headline">Private notes for AI answers</h2>
        <p className="m-0 text-body text-muted-foreground">
          Save the explanations you repeat. A note is only used for AI answers after you read the notice and publish it.
        </p>
        <div>
          <Button asChild><Link href="/mentor/notes">Manage notes</Link></Button>
        </div>
      </section>
      <section aria-labelledby="previews-heading" className="flex flex-col gap-group border-t border-border py-section">
        <h2 id="previews-heading" className="m-0 text-section-title font-strong text-headline">AI answer previews</h2>
        <p className="m-0 text-body text-muted-foreground">Review answers that cite your published notes before seekers can read them.</p>
      <Link className="text-link underline" href="/mentor/payouts">Manage Stripe Express payouts</Link>
        <div><Button asChild><Link href="/mentor/previews">Review answers</Link></Button></div>
      </section>
    </main>
  );
}
