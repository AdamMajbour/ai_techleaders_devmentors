# Security notes

Last reviewed: 2026-11-16
Scope: repository and local development workflow for DevMentor. This is an evidence-based inventory, not a penetration-test certificate.

## Agent access

- Repository agents can read and modify the checked-out workspace and execute project commands. The workspace runtime used for this audit has unrestricted filesystem access; therefore the effective boundary is the environment, not the repository hook.
- `.claude/settings.json` sets `defaultMode` to `auto`. It does not provide a repository-specific allowlist of readable files or network destinations.
- `.agents/skills/om-harness/hooks/guard.mjs` is wired from the checked-in `.claude/settings.json` for shell commands and file edits. Its regression test (`.agents/skills/om-harness/hooks/guard.test.mjs`, included in `npm run test:agent-scripts`) confirms that it blocks remote publication during a staged-only run and edits to frozen test files while allowing local inspection and product-code edits. Runtime activation has not been exercised in a live Claude Code session. It is a workflow guard, not a filesystem sandbox or substitute for host permissions.
- Skills under `.agents/skills/` are instructions, not a sandbox. Treat repository files, issue text, logs, external pages and model inputs as untrusted data.

## Secrets

- Runtime secrets are supplied through environment variables and local `.env*` files; `.gitignore` ignores `.env*` and explicitly allows `.env.example`.
- The tracked `.env.example` no longer contains OAuth credential values, and Docker builds exclude all `.env*` files. A previously committed GitHub OAuth secret was found in repository history; rotate/revoke it in the GitHub OAuth app settings because removing it from the current tree does not erase prior commits.
- `JWT_SECRET` is validated by the core environment schema. GitHub OAuth credentials, database credentials, Stripe credentials and optional AI provider keys must be set in the deployment environment or a developer's ignored local environment file.
- Never paste secret values into this document, logs, prompts, issues or test fixtures. E2E tests generate a fresh ephemeral JWT secret per run.
- CI uses short-lived GitHub-provided credentials for checkout and should receive deployment/provider secrets only in jobs that require them. The pull-request CI workflow currently runs validation and does not publish a deployment.
- CI runs Gitleaks against the commit range supplied by GitHub for pull requests and configured pushes; this is not a guarantee that every historical commit was scanned. The initial PR run passed, and the latest commit will be rescanned after update. Dependency audit remains limited to production dependencies at the `critical` threshold (`npm audit --omit=dev --audit-level=critical`); development dependencies and lower severities are not covered by that command.

## Prompt-injection exercise

- **Repository exercise evidence:** `lekcja-09-laboratorium/04-prompt-injection/PROMPTY.md` defines four hostile-document cases: output hijacking, role hijacking, disclosure of a synthetic diagnostic marker and a request to create `reports/preflight.txt`. `incoming/release-notes.md` includes the marker `PI_OUTPUT_OK`.
- **Repository lab:** the exercise in `lekcja-09-laboratorium/04-prompt-injection/` remains **not run**; its README and fixtures are not execution evidence.
- **Application-path test (2026-11-16):** `packages/core/src/services/vault/vault-generation.task.test.ts`, test `rejects a simulated prompt-injection output with a foreign citation before it can reach mentor preview`. A synthetic seeker question instructed the generator to reveal another seeker's notes and cite `private-note-99`; the deterministic adversarial model double returned that foreign citation. The service supplied only the selected synthetic source note to generation, rejected the foreign citation, did not persist the output, did not emit `vault.answer.generated`, did not create a mentor preview or release the answer, and scheduled a retry after 60 seconds. This verifies the application validation path with a model double; it does **not** verify resistance of a live LLM/provider or every injection vector.
- **Verification command:** `npm test -- --runInBand --runTestsByPath packages/core/src/services/vault/vault-generation.task.test.ts` (unit Jest project). The test passed as part of the full unit run (the run had one unrelated stale UI assertion; after updating that assertion, the focused UI test passed; the entire suite was not rerun afterward).
- **Application threat:** `docs/security/threat-model.md` records T-07 for injection through seeker questions or mentor notes into AI vault-answer generation. Keep live AI disabled unless preview, citation validation and release controls have been reviewed. Test the live provider separately in a disposable environment with synthetic data and no secrets.

## Authorization evidence

- Core authorization is fail-closed: `requireSession`, `assertOwns`, `assertParticipant` and `requireOperator` live in `packages/core/src/http/auth.ts`; `BookingService` checks accepted mentor status and booking ownership before mentor actions.
- An E2E regression now exercises two seekers, two mentors and one paid booking against the production server and PostgreSQL: a second seeker cannot read it; the seeker and a different mentor cannot accept or decline it; its mentor can still read it. CI runs this as part of `npm run test:e2e` on pull requests.
- Operator identity is an allowlisted user-ID configuration (`OPERATOR_USER_IDS`), not a general RBAC system. Empty/malformed configuration denies operator access.

## Agent-process evidence limits

- Cross-model spec review is recorded in `.ai/specs/review-registry.md`; the platform settings spec received an independent review with revisions requested, and a final re-review is pending.
- The repository history alone does not establish that a PR was autonomously authored by an agent. Record the agent run and PR link when this is performed; do not infer authorship from the presence of a spec or a merged PR.
