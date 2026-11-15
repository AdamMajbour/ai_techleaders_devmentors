# Upgrade notes

## 1.0.0 to 1.0.1

This release adds mentor invitation batches, participant-scoped text sessions,
25- and 50-minute bookings, and pilot terms, payout, and retention workflows.
It also includes the production rate-limit fix and expanded local demo fixtures.

### Before deployment

1. Back up PostgreSQL and verify that the backup can be restored.
2. Deploy the release code and install dependencies with `npm ci`.
3. Configure the deployment environment using `.env.example` as a key reference.
   Keep payment processing in test or mock mode unless live payments have been
   explicitly approved and the required legal and operational gates are complete.
4. Apply pending database migrations with `npm run migrate` before serving traffic
   with the new release. This includes the session-duration and mentor-invitation
   batch migrations. The invitation migration creates the batch tables and
   backfills existing mentor access invitations into the new invitation read
   model; it does not remove or rewrite those access invitations.
5. Verify authentication, bookings and checkout, text-session participant
   access, mentor invitations, and the scheduled retention workflow.

### Data and rollback

The session-duration migration changes the schema used for 25- and 50-minute
availability and bookings. Do not roll it back if any 50-minute slot or booking
exists: the migration refuses that rollback. The mentor-invitation migration's
rollback drops the new batch and mentor-invitation tables, including their
backfilled read-model rows. Do not use `npm run migrate:down` as a blanket
release rollback. Prefer restoring a verified backup or deploying a compatible
forward fix; confirm the effect of every migration before any rollback.

### Local demo data

The demo seed can refresh the existing demo accounts and mentor profiles. Run
`npm run db:seed` only against a local or disposable demo database, never a
production database. To create the three upcoming, active, and completed mock
text-session fixtures, first migrate and seed the local database, then run
`npm run db:seed:text-sessions`. This fixture command is idempotent.

### Configuration and compatibility

`MENTOR_PUBLISH_WINDOW_DAYS` defaults to 14. Mentor invitation links expire after
30 days. GitHub OAuth remains optional; configuring it adds a sign-in option but
does not remove the invitation requirement. The local mock checkout remains
available without seeker terms only outside production; live-payment and
published-terms checks stay in force.

Nonparticipants requesting text-session messages now receive `403 Forbidden`
instead of `404 Not Found`. Clients should not rely on the old status code to
hide whether a session exists. Existing booking and message access checks remain
in place.
