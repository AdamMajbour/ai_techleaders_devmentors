import { createEventBus } from './event-bus';
import { registerMailSubscriber } from './mail-subscriber';
import type { Mailer } from '../services/notifications/mailer.port';

const makeLogger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() });

describe('mail subscriber', () => {
  it('sends a message created from a typed event mapping', async () => {
    const logger = makeLogger();
    const bus = createEventBus(logger);
    const mailer: Mailer = { send: jest.fn().mockResolvedValue(undefined) };

    registerMailSubscriber(bus, mailer, logger, (onMail) => {
      onMail('auth.user.registered', ({ userId }) => ({
        to: `${userId}@example.com`,
        template: 'welcome',
        data: { userId },
      }));
    });

    await bus.emit('auth.user.registered', { userId: 'user-1' });

    expect(mailer.send).toHaveBeenCalledWith({
      to: 'user-1@example.com',
      template: 'welcome',
      data: { userId: 'user-1' },
    });
  });

  it('logs only safe event metadata and isolates mailer failures from emission', async () => {
    const logger = makeLogger();
    const bus = createEventBus(logger);
    const mailer: Mailer = {
      send: jest.fn().mockRejectedValue(new Error('failed with secret-token and https://private.test/link')),
    };

    registerMailSubscriber(bus, mailer, logger, (onMail) => {
      onMail('auth.user.registered', () => ({
        to: 'seeker@example.com',
        template: 'sign-in',
        data: { body: 'private message', link: 'https://private.test/link?token=secret-token' },
      }));
    });

    await expect(bus.emit('auth.user.registered', { userId: 'user-1' })).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith('Mail subscriber failed', {
      event: 'auth.user.registered',
    });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('private message');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret-token');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('https://private.test/link');
  });
});
