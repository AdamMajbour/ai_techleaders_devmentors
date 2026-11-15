import { getMailerSettings } from '../../../config/env';
import type { Mailer, MailMessage } from '../mailer.port';
import { ConsoleMailer } from './console-mailer';
import { HttpMailer } from './http-mailer';

/** Resolves mail configuration only when a message is sent, keeping application startup lazy. */
export class ConfiguredMailer implements Mailer {
  constructor(
    private readonly settings: typeof getMailerSettings = getMailerSettings,
    private readonly write: (output: string) => void = console.log,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const settings = this.settings();
    if (settings.MAILER_MODE === 'console') {
      await new ConsoleMailer(this.write).send(message);
      return;
    }

    if (!settings.MAILER_API_KEY || !settings.MAIL_FROM) {
      throw new Error('HTTP mail settings are incomplete.');
    }

    await new HttpMailer({
      apiKey: settings.MAILER_API_KEY,
      from: settings.MAIL_FROM,
      fetcher: this.fetcher,
    }).send(message);
  }
}
