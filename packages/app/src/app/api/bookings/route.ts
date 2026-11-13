import { apiHandler, requireSession, withScope } from '@devmentor/core/server';
export const GET = apiHandler(async (request) => {
 const session = await requireSession(request);
 return withScope(({ bookingService }) => bookingService.listForParticipant(session));
});
