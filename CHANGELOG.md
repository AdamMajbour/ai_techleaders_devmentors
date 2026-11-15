# DevMentor Changelog

## [1.0.1] - 2026-11-15

### Added

- Expanded local demo data with additional mentor profiles and upcoming, active,
  and completed sample sessions and messages.
- Added an idempotent `npm run db:seed:text-sessions` command for preparing
  participant session fixtures.
- Added the platform pricing and settings proposal, tester analysis, and updated
  GitHub pipeline tracker documentation.

### Changed

- Updated demo seeker credentials and invitation state safely when rerunning the
  seed script; refreshed existing demo mentor profiles.
- Marked the earlier pilot booking flow specification as superseded by the
  platform settings proposal.

## [1.0.0] - 2026-11-15

First versioned release of the DevMentor pilot platform.

### Added

- Sequential mentor invitation batches with acceptance and availability tracking, pause controls, expiring links, and backfill of existing mentor invitations ([#44](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/44)).
- Participant-scoped text session API and local mock session setup ([#40](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/40)).
- Mentor notes, profile publishing, vault answers, and selected-time booking ([#33](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/33)).
- Pilot terms and consent history, Stripe test-mode onboarding and payouts, legal holds, retention jobs, and pilot metrics ([#34](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/34)).
- GitHub sign-in, reusable account links, and role-aware navigation ([#27](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/27)).
- 25- and 50-minute bookings with server-calculated pricing and local mock checkout ([#39](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/39)).
- Design tokens, Storybook, and visual checks in CI ([#25](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/25)).

### Fixed

- Kept rate limiting enabled in production and added regression coverage.
- Kept local demo checkout usable when seeker terms are not configured ([#38](https://github.com/AdamMajbour/ai_techleaders_devmentors/pull/38)).

### Operations and security

- Added access-boundary and threat-model documentation, security audit evidence,
  production bundle checks, and session access controls.
- GitHub Actions passed for base commit `71f3b8b` (run
  [43755720704](https://github.com/AdamMajbour/ai_techleaders_devmentors/actions/runs/43755720704)).

### Database migration and rollback

Back up PostgreSQL and verify the backup before deployment. Run `npm run migrate`
using the release code. The release migration for mentor invitation batches
backfills existing mentor invitations into new tables. The session-duration
migration refuses to roll back if any 50-minute slots or bookings exist. Preserve
such data by restoring the database backup or writing a forward migration before
rolling application code back. Do not run `npm run migrate:down` as a blanket
rollback: earlier migrations include data-bearing tables. For an application
rollback, deploy the commit immediately before the release tag
(`git rev-parse v1.0.0^`) and restore a compatible database backup, or keep the
expanded schema and use a backward-compatible forward fix. Validate health,
authentication, booking, invitation, and session flows after recovery.
