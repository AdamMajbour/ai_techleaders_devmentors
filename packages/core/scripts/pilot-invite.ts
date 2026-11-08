import '../../db/src/load-env';
import { closeORM } from '@devmentor/db';
import { magicLinkRequestSchema } from '../src/validators/auth/magic-link.schema';
import { getContainer } from '../src/container/container';
import type { InvitationRole } from '../src/services/auth/invitation.service';

const HELP = `Usage:
  npm run pilot:invite -- --email <address> --name <display name> --role <seeker|mentor>
  npm run pilot:invite -- --list
  npm run pilot:invite -- --help

Roles: seeker, mentor.

Founder A operator bootstrap:
  1. Invite founder A first, then have them request and consume a sign-in link.
  2. Run --list to find founder A's accepted user id and set OPERATOR_USER_IDS to that id.
  3. Only after OPERATOR_USER_IDS is set, invite the other participants.

Use --list to review invitation status and accepted user ids.`;

type InviteOptions = {
  email?: string;
  name?: string;
  role?: string;
  list: boolean;
  help: boolean;
};

function parseArgs(args: string[]): InviteOptions {
  const options: InviteOptions = { list: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') {
      options.help = true;
      continue;
    }
    if (flag === '--list') {
      options.list = true;
      continue;
    }
    if (flag === '--email' || flag === '--name' || flag === '--role') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing option value.');
      index += 1;
      if (flag === '--email') options.email = value;
      if (flag === '--name') options.name = value;
      if (flag === '--role') options.role = value;
      continue;
    }
    throw new Error('Unknown option.');
  }
  return options;
}

function printInvitations(
  invitations: Array<{
    email: string;
    displayName: string;
    role: InvitationRole;
    acceptedByUserId: string | null;
    acceptedAt: Date | null;
    revokedAt: Date | null;
  }>,
): void {
  if (invitations.length === 0) {
    console.log('No invitations found.');
    return;
  }
  console.log('email\tdisplay name\trole\taccepted user id\tstatus');
  for (const invitation of invitations) {
    const status = invitation.revokedAt
      ? 'revoked'
      : invitation.acceptedAt
        ? 'accepted'
        : 'pending';
    console.log(
      `${invitation.email}\t${invitation.displayName}\t${invitation.role}\t${invitation.acceptedByUserId ?? ''}\t${status}`,
    );
  }
}

async function main(): Promise<void> {
  let options: InviteOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch {
    console.error('Invalid arguments. Run `npm run pilot:invite -- --help` for usage.');
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.list && (options.email || options.name || options.role)) {
    console.error('--list cannot be combined with invitation options.');
    process.exitCode = 1;
    return;
  }

  if (!options.list) {
    const parsedEmail = magicLinkRequestSchema.safeParse({ email: options.email });
    if (!parsedEmail.success || !options.name?.trim() || (options.role !== 'seeker' && options.role !== 'mentor')) {
      console.error('Provide a valid --email, a non-empty --name, and --role seeker or --role mentor.');
      process.exitCode = 1;
      return;
    }
  }

  try {
    const container = await getContainer();
    const { invitationService } = container.createScope().cradle;
    if (options.list) {
      printInvitations(await invitationService.list());
      return;
    }

    const invitation = await invitationService.invite({
      email: options.email!,
      displayName: options.name!,
      role: options.role as InvitationRole,
    });
    console.log(`Invited ${invitation.email} as ${invitation.role}.`);
  } catch {
    console.error('Unable to complete the invitation operation. Check database connectivity and invitation status.');
    process.exitCode = 1;
  } finally {
    await closeORM();
  }
}

void main();
