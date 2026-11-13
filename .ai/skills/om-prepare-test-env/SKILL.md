# Repository notes for om-prepare-test-env

- Native Windows entrypoint: `.ai/scripts/test-env-up.ps1`; teardown: `.ai/scripts/test-env-down.ps1`.
- The app's local database is configured from `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD`. Keep `.env.local` and the shared `docker-compose.yml` database untouched; the generated environment uses a disposable PostgreSQL 17 container named `devmentor-test-<runId>` bound to loopback on a free port.
- The workspace currently has an incomplete `node_modules` tree. `npm ci` failed with `EPERM` unlinking `node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node`; do not retry a clean install until the process holding that native module is released. The entrypoint must stop before starting services when this incomplete locked state is found.
- Generation-time browser check: `.ai/browsers/agent-browser.md`; installed `agent-browser` v0.35.2 and its `doctor --json` live launch check passed on 2026-11-11.
- Cold/warm app verification is pending because dependency installation is blocked. After repairing dependencies, rerun `powershell -ExecutionPolicy Bypass -File .ai/scripts/test-env-up.ps1` twice; confirm first run starts a healthy app and second reports `TEST_ENV_REUSED=1`. Stop with `.ai/scripts/test-env-down.ps1`.
