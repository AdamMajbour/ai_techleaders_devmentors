import type { Mailer, MailMessage } from '../mailer.port';
import { redact } from '../../../logger';

/**
 * Development-only adapter. It preserves the existing sign-in link preview but masks sensitive
 * message fields before printing them; it must not be used as a production mail transport.
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
        JSON.stringify(redact(data), null, 2),
      ].join('\n'),
    );
  }
}
