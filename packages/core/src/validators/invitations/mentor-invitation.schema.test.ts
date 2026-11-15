/** @jest-environment node */
import { mentorInvitationCreateSchema } from './mentor-invitation.schema';

describe('mentorInvitationCreateSchema', () => {
  it.each(['anna', 'anna@', 'anna@example', '   ', `${'a'.repeat(245)}@example.com`])(
    'rejects invalid or overlong email %s',
    (email) => {
      expect(mentorInvitationCreateSchema.safeParse({ email, stackTags: ['typescript'] }).success).toBe(false);
    },
  );

  it('trims and lowercases a valid email and allows one to four supported tags', () => {
    expect(mentorInvitationCreateSchema.parse({ email: ' Anna@Example.COM ', stackTags: ['typescript', 'python'] })).toEqual({
      email: 'anna@example.com',
      stackTags: ['typescript', 'python'],
    });
  });

  it('rejects missing, empty, duplicate, unknown, and oversized tag selections', () => {
    const email = 'anna@example.com';
    for (const stackTags of [undefined, [], ['typescript', 'typescript'], ['other'], ['typescript', 'nextjs', 'node-js', 'python', 'python']]) {
      expect(mentorInvitationCreateSchema.safeParse({ email, stackTags }).success).toBe(false);
    }
  });

  it('rejects unknown fields', () => {
    expect(mentorInvitationCreateSchema.safeParse({ email: 'anna@example.com', stackTags: ['typescript'], token: 'secret' }).success).toBe(false);
  });
});
