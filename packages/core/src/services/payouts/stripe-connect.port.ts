export interface ExpressAccountStatus {
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersEnabled: boolean;
}

export interface StripeConnectPort {
  createExpressAccount(input: { userId: string; email: string }): Promise<string>;
  createOnboardingLink(stripeAccountId: string): Promise<string>;
  accountStatus(stripeAccountId: string): Promise<ExpressAccountStatus>;
  createTransfer(input: { stripeAccountId: string; amountMinor: number; currency: string; idempotencyKey: string; ledgerEntryId: string }): Promise<string>;
  retrieveTransfer(stripeTransferId: string): Promise<{ id: string; reversed: boolean }>;
}
