import type { Logger } from '../logger';
import type { EventBus } from './event-bus';
import type { EventName } from './event-map';

const ALL_EVENTS: EventName[] = [
  'auth.user.registered',
  'articles.article.created',
  'articles.article.updated',
  'articles.article.deleted',
];

/** Writes one info line per domain event. Add a name above when a new event is added to the map. */
export function registerLoggingSubscriber(bus: EventBus, logger: Logger): void {
  for (const name of ALL_EVENTS) {
    bus.on(name, (payload) => logger.info('Domain event', { event: name, ...payload }));
  }
}
