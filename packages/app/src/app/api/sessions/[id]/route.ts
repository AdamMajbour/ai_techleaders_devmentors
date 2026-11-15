import { idSchema, parseOrThrow } from '@devmentor/core';
import { apiHandler, requireSession, withScope } from '@devmentor/core/server';

type Context = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

/** Returns a participant-scoped private text session and its messages. */
export const GET = apiHandler(async (request: Request, context: Context) => {
  const session = await requireSession(request);
  const { id: rawId } = await context.params;
  const id = parseOrThrow(idSchema, rawId);

  return withScope(async ({ bookingService, messageService }) => {
    const messages = await messageService.list(session, id);
    const booking = await bookingService.getById(session, id);
    const startsAt = Date.parse(messages.session.startsAt);
    const endsAt = Date.parse(messages.session.endsAt);
    const now = Date.parse(messages.serverTime);

    return {
      id: booking.id,
      status: booking.status,
      isOpen: booking.status === 'accepted' && now >= startsAt && now < endsAt,
      messages: messages.items,
    };
  });
});
