import type { Mailer, MailMessage } from '../mailer.port';

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

export interface HttpMailerOptions {
  apiKey: string;
  from: string;
  fetcher?: typeof fetch;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function magicLinkContent(message: MailMessage): { subject: string; text: string; html: string } {
  if (message.template !== 'magic-link' || typeof message.data.url !== 'string') {
    throw new Error('Unsupported e-mail template.');
  }

  let url: URL;
  try {
    url = new URL(message.data.url);
  } catch {
    throw new Error('Invalid sign-in link.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Invalid sign-in link.');
  }

  const safeUrl = escapeHtml(url.toString());
  return {
    subject: 'Your DevMentor sign-in link',
    text: `Use this one-time link to sign in to DevMentor:\n\n${url.toString()}\n\nIt expires in 15 minutes. If you did not request it, you can ignore this message.`,
    html: `<p>Use this one-time link to sign in to DevMentor:</p><p><a href="${safeUrl}">Sign in to DevMentor</a></p><p>It expires in 15 minutes. If you did not request it, you can ignore this message.</p>`,
  };
}

export class HttpMailer implements Mailer {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: HttpMailerOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async send(message: MailMessage): Promise<void> {
    const content = magicLinkContent(message);
    const response = await this.fetcher(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.options.from,
        to: [message.to],
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mail provider request failed (HTTP ${response.status}).`);
    }
  }
}
