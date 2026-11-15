import { parseOrThrow, termsKindSchema } from '@devmentor/core';
import { apiHandler, withScope } from '@devmentor/core/server';
import { isMockPaymentInteractionEnabled } from '@/lib/mock-payment';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: Request) => {
  const kind = parseOrThrow(termsKindSchema, new URL(request.url).searchParams.get('kind'));
  return withScope(async ({ termsService }) => {
    const current = await termsService.current(kind);
    if (current || kind !== 'seeker' || !isMockPaymentInteractionEnabled()) return current;

    return {
      id: '00000000-0000-4000-8000-000000000099',
      kind: 'seeker' as const,
      version: 'mock-checkout-only',
      body: 'This is a simulated checkout for local testing. No real payment is taken.',
      sha256: '0'.repeat(64),
      publishedAt: null,
      reviewed: false,
      testOnly: true,
    };
  });
});
