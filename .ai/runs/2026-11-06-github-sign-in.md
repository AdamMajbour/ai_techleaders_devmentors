# GitHub sign-in implementation

## Goal

Let invited pilot participants sign in using GitHub while preserving invitation-only access.

## Work

- Searched `.ai/specs/` and found no GitHub sign-in requirement; the pilot spec specifies invitation-bound e-mail magic links.
- Added a dated requirement spec for GitHub as an additional invitation-bound sign-in method.
- Added an OAuth authorization start and callback using one-time state, GitHub's verified primary e-mail, the existing invitation acceptance flow, and the existing session cookie.
- Added optional OAuth environment settings and a sign-in action with user-facing failure messages.

## Verification

- `npm.cmd run type-check --workspace @devmentor/app` passed.
- `git diff --check` passed.
- Full tests were not run.
- Follow-up from the local OAuth trace: valid callbacks originally returned to `/login`, which looked like no navigation despite issuing a session. Successful sign-in now redirects to `/mentors`.

## Setup required

Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` and register `{APP_BASE_URL}/api/auth/github/callback` in the GitHub OAuth App. No OAuth credentials are present in this environment, so a live provider round-trip could not be exercised.

## Demo account access

- Added password sign-in to `/login` and local GitHub mock buttons for the mentee, mentor, and operator demo accounts.
- The local mock endpoint rejects production requests and checks each account's accepted invitation; operator access also requires its configured operator ID.
- The seed now leaves the mock mentor and `ada@devmentor.dev` without passwords, creates Ada as an accepted mentor, and gives the operator both mentor access and the operator ID configured for local development.
- App and database TypeScript checks pass. No tests were run.
