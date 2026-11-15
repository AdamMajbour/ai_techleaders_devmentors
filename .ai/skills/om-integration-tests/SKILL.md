# Repository override for `om-integration-tests`

Extend the installed skill with these repository requirements. The installed skill and its safety, environment, exploration, and validation rules continue to apply.

## Required Markdown scenario

- Whenever this skill creates or changes an integration test, it MUST also create or update a human-readable Markdown scenario in `.ai/qa/{AREA}/{AREA}-{number}-{slug}.md`. Markdown is mandatory documentation, not an optional deliverable.
- `{AREA}` is the stable, lowercase kebab-case business area (for example `auth`, `mentorship`, `appointments`). Use the same area directory and filename prefix. `{number}` is a zero-padded, three-digit sequence (`001`, `002`, …) scoped to the area; inspect existing scenario files in that area and choose the next unused number. Never overwrite another scenario to reuse its number.
- `{slug}` is a concise lowercase kebab-case description of the business behavior and expected outcome. Keep names stable when editing an existing scenario.
- The Markdown scenario MUST link to the executable TypeScript test implementation using a relative Markdown link, e.g. `[TypeScript test](../../../packages/app/e2e/auth-login.spec.ts)`. Resolve the relative path from the scenario file to the real test file and verify it exists. Do not leave placeholders or link to a directory.
- If no executable TypeScript test exists yet, create the test first, then add its link. If the repository has no suitable TypeScript integration runner, follow the base skill's setup gate; do not claim a nonexistent implementation.
- Use this minimum scenario structure:

  ```markdown
  # {AREA}-{number}: {scenario title}

  **Implementation:** [TypeScript test](relative/path/to/test.ts)

  ## Cel
  User-visible/business behavior under test.

  ## Scenariusz
  Given ...
  When ...
  Then ...

  ## Dane i izolacja
  Required setup, per-test data ownership, and cleanup.
  ```

- Keep one business case per scenario. Add separate scenario files for materially different success, validation, authorization, missing-resource, conflict/idempotency, boundary, or external-failure behavior when those cases are in scope.

## Required integration-test practices

Before authoring or reviewing a scenario or its test, read and apply the repository guide `best-practices-testow-integracyjnych.md` in full. Treat its rules as mandatory for both the Markdown scenario and the TypeScript implementation, in addition to the base skill. In particular:

- Assert observable business outcomes, not internal implementation details; structure scenarios as Given–When–Then and keep each focused on one business case.
- Make tests deterministic, independent, and isolated: arrange their own data, avoid order/shared-state/current-time/flaky-service dependencies, and clean up when needed. Prefer API or test-layer setup when it does not bypass the behavior under test.
- Assert only relevant outcomes at the appropriate integration boundaries, with concrete assertions that explain failures.
- Control external dependencies with test environments, fakes, or interception while keeping the components under test real. Include relevant positive, negative, boundary, authorization, conflict, and idempotency cases in scope.
- Use accessible semantic UI selectors first, then stable test IDs only when needed; avoid structural/style selectors and arbitrary sleeps. Keep important test steps visible instead of hiding them in broad helpers.
- Name tests and scenarios for the condition and expected result. AI-generated drafts must be checked against actual requirements and observed application behavior, never model assumptions.

At completion, confirm the Markdown scenario exists at the required path, its relative TypeScript link resolves to the authored test, and both artifacts follow the guide. The base skill's requirement to execute and verify a new test remains in force.
