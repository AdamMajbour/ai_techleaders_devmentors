import { createEventBus } from './event-bus';
import { registerLoggingSubscriber } from './logging-subscriber';

const logger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() });

describe('event bus', () => {
  it('delivers a typed payload to every subscriber of that event only', async () => {
    const bus = createEventBus(logger());
    const created = jest.fn();
    const deleted = jest.fn();
    bus.on('articles.article.created', created);
    bus.on('articles.article.deleted', deleted);

    await bus.emit('articles.article.created', { articleId: 'a', authorId: 'u' });

    expect(created).toHaveBeenCalledWith({ articleId: 'a', authorId: 'u' });
    expect(deleted).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', async () => {
    const bus = createEventBus(logger());
    const handler = jest.fn();
    const off = bus.on('auth.user.registered', handler);
    off();

    await bus.emit('auth.user.registered', { userId: 'u' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('logs a failing subscriber and still runs the others, without throwing', async () => {
    const log = logger();
    const bus = createEventBus(log);
    const healthy = jest.fn();
    bus.on('auth.user.registered', () => {
      throw new Error('boom');
    });
    bus.on('auth.user.registered', healthy);

    await expect(bus.emit('auth.user.registered', { userId: 'u' })).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith('Event subscriber failed', expect.objectContaining({ event: 'auth.user.registered' }));
  });

  it('the logging subscriber writes the event name and ids', async () => {
    const log = logger();
    const bus = createEventBus(log);
    registerLoggingSubscriber(bus, log);

    await bus.emit('articles.article.created', { articleId: 'a1', authorId: 'u1' });

    expect(log.info).toHaveBeenCalledWith('Domain event', { event: 'articles.article.created', articleId: 'a1', authorId: 'u1' });
  });

  it('logs the approval lifecycle event names with id-only payloads', async () => {
    const log = logger();
    const bus = createEventBus(log);
    registerLoggingSubscriber(bus, log);

    await bus.emit('approvals.approval.requested', { approvalId: 'approval-1' });
    await bus.emit('approvals.approval.approved', { approvalId: 'approval-1' });
    await bus.emit('approvals.approval.rejected', { approvalId: 'approval-2' });

    expect(log.info).toHaveBeenCalledWith('Domain event', {
      event: 'approvals.approval.requested',
      approvalId: 'approval-1',
    });
    expect(log.info).toHaveBeenCalledWith('Domain event', {
      event: 'approvals.approval.approved',
      approvalId: 'approval-1',
    });
    expect(log.info).toHaveBeenCalledWith('Domain event', {
      event: 'approvals.approval.rejected',
      approvalId: 'approval-2',
    });
  });
});
