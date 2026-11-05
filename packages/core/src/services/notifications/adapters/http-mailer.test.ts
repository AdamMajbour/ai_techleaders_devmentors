/** @jest-environment node */
import type { MailMessage } from '../mailer.port';
import { ConfiguredMailer } from './configured-mailer';
import { HttpMailer } from './http-mailer';

const message: MailMessage = {
  to: 'ada@example.com',
  template: 'magic-link',
  data: { url: 'https://devmentor.example/auth/verify?token=private-token' },
};

describe('HttpMailer', () => {
  it('sends a magic link through the provider API without exposing provider credentials in payloads', async () => {
    const fetcher = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(null, { status: 202 });
    });
    const mailer = new HttpMailer({
      apiKey: 'secret-provider-key',
      from: 'DevMentor <hello@example.com>',
      fetcher,
    });

    await mailer.send(message);

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: 'Bearer secret-provider-key',
          'Content-Type': 'application/json',
        },
      }),
    );
    const [, options] = fetcher.mock.calls[0];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      from: 'DevMentor <hello@example.com>',
      to: ['ada@example.com'],
      subject: 'Your DevMentor sign-in link',
      text: expect.stringContaining(String(message.data.url)),
      html: expect.stringContaining('private-token'),
    });
  });

  it('rejects unknown templates and unsafe URLs without sending a request', async () => {
    const fetcher = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(null);
    });
    const mailer = new HttpMailer({ apiKey: 'secret-provider-key', from: 'hello@example.com', fetcher });

    await expect(mailer.send({ ...message, template: 'other' })).rejects.toThrow('Unsupported e-mail template');
    await expect(mailer.send({ ...message, data: { url: 'javascript:alert(1)' } })).rejects.toThrow(
      'Invalid sign-in link',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not include response bodies or secrets in provider errors', async () => {
    const fetcher = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return new Response('provider echoed token private-token', { status: 401 });
      },
    );
    const mailer = new HttpMailer({ apiKey: 'secret-provider-key', from: 'hello@example.com', fetcher });

    await expect(mailer.send(message)).rejects.toThrow('Mail provider request failed (HTTP 401).');
  });
});

describe('ConfiguredMailer', () => {
  it('does not read mail settings until a message is sent', () => {
    const settings = jest.fn(() => ({ MAILER_MODE: 'console' as const }));
    new ConfiguredMailer(settings);
    expect(settings).not.toHaveBeenCalled();
  });

  it('uses the console adapter by default', async () => {
    const settings = jest.fn(() => ({ MAILER_MODE: 'console' as const }));
    const write = jest.fn();
    await new ConfiguredMailer(settings, write).send(message);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('[development mail]'));
  });

  it('uses HTTP delivery when configured', async () => {
    const settings = jest.fn(() => ({
      MAILER_MODE: 'http' as const,
      MAILER_API_KEY: 'provider-key',
      MAIL_FROM: 'hello@example.com',
    }));
    const write = jest.fn();
    const fetcher = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(null, { status: 202 });
    });

    await new ConfiguredMailer(settings, write, fetcher).send(message);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer provider-key' });
    expect(write).not.toHaveBeenCalled();
  });
});
