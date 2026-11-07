import { SessionPage } from './session-page';

export const dynamic = 'force-dynamic';

export default async function BookingSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionPage key={id} bookingId={id} />;
}
