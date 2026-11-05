import type { Mailer, MailMessage } from '../mailer.port';

/**
 * Development-only adapter. Its explicit console output includes message data, including links,
 * so it must not be used as a production mail transport or routed through the structured logger.
 */
export class ConsoleMailer implements Mailer {
  constructor(private readonly write: (output: string) => void = console.log) {}

  async send({ to, template, data }: MailMessage): Promise<void> {
    this.write(
      [
        '[development mail]',
        `To: ${to}`,
        `Template: ${template}`,
        'Data:',
        JSON.stringify(data, null, 2),
      ].join('\n'),
    );
  }
}
