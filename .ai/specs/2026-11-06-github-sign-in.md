# GitHub sign-in

Status: Implemented.

## Requirement

People invited to the pilot should be able to sign in with GitHub as well as request an e-mail sign-in link. GitHub is an authentication method, not a way to create an uninvited account or bypass the invitation-only pilot.

## Behavior

- The sign-in page offers **Continue with GitHub**.
- OAuth uses GitHub's authorization-code flow with `read:user` and `user:email`; a random, short-lived, HTTP-only state cookie protects the callback.
- The application accepts only GitHub's verified primary e-mail. The e-mail must match an unrevoked invitation; the existing invitation acceptance and session mechanisms are reused.
- Missing OAuth configuration, denied authorization, missing verified primary e-mail, and unmatched/revoked invitations return the person to sign-in with an actionable message.
- Credentials are optional. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; register `{APP_BASE_URL}/api/auth/github/callback` as the OAuth callback URL. With no credentials configured, GitHub sign-in is unavailable and e-mail sign-in remains usable.

## Security constraints

- Never trust a GitHub e-mail without confirming `verified` and `primary` from the authenticated `/user/emails` endpoint.
- Do not accept an e-mail or user identity from callback query parameters.
- Keep the access token server-side; never store it or return it to the browser.
- Continue to use the application's existing HTTP-only session cookie and invitation authorization.
