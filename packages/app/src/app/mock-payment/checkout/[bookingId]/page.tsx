import { notFound } from 'next/navigation';
import { isMockPaymentInteractionEnabled } from '@/lib/mock-payment';
import { MockCheckoutView } from './mock-checkout-view';

export const dynamic = 'force-dynamic';

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  if (!isMockPaymentInteractionEnabled()) notFound();
  const { bookingId } = await params;
  return <MockCheckoutView bookingId={bookingId} />;
}
