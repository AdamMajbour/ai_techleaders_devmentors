import type { Logger } from '../logger';
import type { Mailer, MailMessage } from '../services/notifications/mailer.port';
import type { EventBus } from './event-bus';
import type { EventMap, EventName } from './event-map';

export interface MailEventRegistrar {
  <TName extends EventName>(
    event: TName,
    createMessage: (payload: EventMap[TName]) => MailMessage,
  ): void;
}

/**
 * Registers typed event-to-mail mappings. Add mappings alongside new EventMap entries and emitters;
 * no event payload or mail data is passed to the structured logger on failure.
 */
export function registerMailSubscriber(
  bus: EventBus,
  mailer: Mailer,
  logger: Logger,
  configure: (onMail: MailEventRegistrar) => void = () => undefined,
): void {
  const onMail: MailEventRegistrar = (event, createMessage) => {
    bus.on(event, async (payload) => {
      try {
        await mailer.send(createMessage(payload));
      } catch {
        logger.error('Mail subscriber failed', { event });
      }
    });
  };

  configure(onMail);
}
