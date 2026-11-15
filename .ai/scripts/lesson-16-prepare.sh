#!/bin/sh
# Prepare/refresh the environment for the lesson 16 access control scene.
set -eu
cd "$(dirname "$0")/../.."
# Keep this disposable environment for the recording day. A refresh reseeds only QA rows.
TEST_ENV_CACHE_TTL_SECONDS=86400 sh .ai/scripts/test-env-up.sh
node .ai/scripts/lesson-16-session.mjs
