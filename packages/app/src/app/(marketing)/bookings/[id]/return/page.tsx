import { BookingReturnView } from './booking-return-view';

export const dynamic = 'force-dynamic';

export default async function BookingReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingReturnView key={id} bookingId={id} />;
}
