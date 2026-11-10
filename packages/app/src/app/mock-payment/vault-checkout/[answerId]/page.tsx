import { notFound } from 'next/navigation';
import { isMockPaymentInteractionEnabled } from '@/lib/mock-payment';
import { VaultMockCheckoutView } from './vault-mock-checkout-view';

export const dynamic = 'force-dynamic';

export default async function VaultMockCheckoutPage({ params }: { params: Promise<{ answerId: string }> }) {
  if (!isMockPaymentInteractionEnabled()) notFound();
  const { answerId } = await params;
  return <VaultMockCheckoutView answerId={answerId} />;
}
