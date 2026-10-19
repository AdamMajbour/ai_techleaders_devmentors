import type { Logger } from '../logger';
import type { EventMap, EventName } from './event-map';

type Handler<TName extends EventName> = (payload: EventMap[TName]) => void | Promise<void>;

/**
 * A typed, in-process emitter. It is not a queue: events exist for side effects such as logging or
 * cache invalidation. A subscriber that throws is logged and never fails the mutation that emitted.
 */
export function createEventBus(logger: Logger) {
  const handlers = new Map<EventName, Set<Handler<EventName>>>();

  return {
    on<TName extends EventName>(name: TName, handler: Handler<TName>): () => void {
      const set = handlers.get(name) ?? new Set();
      set.add(handler as Handler<EventName>);
      handlers.set(name, set);
      return () => set.delete(handler as Handler<EventName>);
    },

    async emit<TName extends EventName>(name: TName, payload: EventMap[TName]): Promise<void> {
      // `.then` turns a synchronous throw into a rejection, so one bad subscriber cannot break the others.
      const results = await Promise.allSettled(
        [...(handlers.get(name) ?? [])].map((handler) => Promise.resolve().then(() => handler(payload))),
      );
      for (const result of results) {
        if (result.status === 'rejected') logger.error('Event subscriber failed', { event: name, error: result.reason });
      }
    },
  };
}

export type EventBus = ReturnType<typeof createEventBus>;
