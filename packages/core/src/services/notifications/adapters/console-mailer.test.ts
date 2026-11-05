import { ConsoleMailer } from './console-mailer';

describe('ConsoleMailer', () => {
  it('prints the recipient, template, and data (including development links) to its console sink', async () => {
    const write = jest.fn();
    const mailer = new ConsoleMailer(write);

    await mailer.send({
      to: 'seeker@example.com',
      template: 'sign-in-link',
      data: { link: 'https://dev.local/verify?token=development-token' },
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('https://dev.local/verify?token=development-token'),
    );
    expect(write.mock.calls[0][0]).toContain('Template: sign-in-link');
    expect(write.mock.calls[0][0]).toContain('To: seeker@example.com');
  });

  it('redacts sensitive question and body fields while retaining intended development link output', async () => {
    const write = jest.fn();
    const mailer = new ConsoleMailer(write);
    const question = 'Private question: production database credentials?';

    await mailer.send({
      to: 'mentor@example.com',
      template: 'booking-question',
      data: {
        question,
        body: 'Private body content',
        link: 'https://dev.local/verify?token=development-token',
      },
    });

    const output = write.mock.calls[0][0] as string;
    expect(output).not.toContain(question);
    expect(output).not.toContain('Private body content');
    expect(output).toContain('"question": "[redacted]"');
    expect(output).toContain('"body": "[redacted]"');
    expect(output).toContain('https://dev.local/verify?token=development-token');
  });
});
