import Stripe from 'stripe';
import { getAppBaseUrl, getPaymentSettings, type PaymentSettings } from '../../config/env';
import type { StripeConnectPort } from './stripe-connect.port';

type StripeClient = Pick<Stripe, 'accounts' | 'accountLinks' | 'transfers'>;
type StripeFactory = (key: string) => StripeClient;

export class StripeConnectGateway implements StripeConnectPort {
  private stripe: StripeClient | null = null;

  constructor(
    private readonly settings: PaymentSettings = getPaymentSettings(),
    private readonly createClient: StripeFactory = (key) => new Stripe(key),
    private readonly baseUrl: () => string = getAppBaseUrl,
  ) {}

  async createExpressAccount(input: { userId: string; email: string }): Promise<string> {
    const account = await this.getStripe().accounts.create({
      type: 'express', country: 'PL', email: input.email,
      capabilities: { transfers: { requested: true } },
      metadata: { devmentor_user_id: input.userId },
    });
    return account.id;
  }

  async createOnboardingLink(stripeAccountId: string): Promise<string> {
    const root = this.baseUrl();
    const link = await this.getStripe().accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${root}/mentor/payouts?onboarding=refresh`,
      return_url: `${root}/mentor/payouts?onboarding=complete`,
      type: 'account_onboarding',
    });
    if (!link.url.startsWith('https://')) throw new Error('Stripe returned an invalid Connect onboarding URL.');
    return link.url;
  }

  async accountStatus(stripeAccountId: string) {
    const account = await this.getStripe().accounts.retrieve(stripeAccountId);
    if ('deleted' in account && account.deleted) throw new Error('The connected account was deleted.');
    return {
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      transfersEnabled: account.capabilities?.transfers === 'active',
    };
  }

  async createTransfer(input: { stripeAccountId: string; amountMinor: number; currency: string; idempotencyKey: string; ledgerEntryId: string }): Promise<string> {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Transfer amount must be positive minor units.');
    const transfer = await this.getStripe().transfers.create({
      amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      destination: input.stripeAccountId,
      metadata: { devmentor_ledger_entry_id: input.ledgerEntryId },
    }, { idempotencyKey: input.idempotencyKey });
    return transfer.id;
  }

  async retrieveTransfer(stripeTransferId: string): Promise<{ id: string; reversed: boolean }> {
    const transfer = await this.getStripe().transfers.retrieve(stripeTransferId);
    return { id: transfer.id, reversed: transfer.reversed };
  }

  private getStripe(): StripeClient {
    if (!this.settings.STRIPE_CONNECT_ENABLED || this.settings.PAYMENTS_MODE !== 'stripe' || !this.settings.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      throw new Error('Stripe Express Connect is disabled or is not configured for test mode.');
    }
    this.stripe ??= this.createClient(this.settings.STRIPE_SECRET_KEY);
    return this.stripe;
  }
}
