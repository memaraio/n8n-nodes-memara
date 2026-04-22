#!/usr/bin/env bash
# Thin wrapper: full release is implemented in docker-n8n.sh (monorepo-safe GitHub mirror).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/docker-n8n.sh" publish-release "$@"
