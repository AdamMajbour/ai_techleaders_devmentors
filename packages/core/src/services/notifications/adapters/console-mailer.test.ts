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
});
