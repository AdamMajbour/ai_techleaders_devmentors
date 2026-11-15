/** @jest-environment node */
import { createPilotMemberResolver } from './server';

describe('invitation-backed pilot-member resolver', () => {
  it('uses the invitation service through the existing resolver contract', async () => {
    const invitationService = { isPilotMember: jest.fn(async () => true) };
    const resolver = createPilotMemberResolver(invitationService);

    await expect(resolver({ userId: 'pilot-user' }, new Request('http://localhost'))).resolves.toBe(true);
    expect(invitationService.isPilotMember).toHaveBeenCalledWith('pilot-user');
  });
});
