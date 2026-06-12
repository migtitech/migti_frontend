#!/usr/bin/env bash
set -euo pipefail

# Git post-checkout hook: merge prod into dev_indore / dev_noida on branch checkout.
# Args: $1=previous HEAD, $2=new HEAD, $3=1 for branch checkout, 0 for file checkout.

BRANCH_CHECKOUT="${3:-0}"
[ "${BRANCH_CHECKOUT}" = "1" ] || exit 0

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || true)
case "${BRANCH}" in
  dev_indore | dev_noida) ;;
  *) exit 0 ;;
esac

echo "=== Auto-syncing ${BRANCH} from prod (post-checkout) ==="

if ! git fetch origin prod --quiet 2>/dev/null; then
  echo "Warning: could not fetch origin/prod, skipping auto-sync"
  exit 0
fi

if ! git show-ref --verify --quiet refs/remotes/origin/prod; then
  echo "Warning: origin/prod not found, skipping auto-sync"
  exit 0
fi

if git merge-base --is-ancestor origin/prod HEAD 2>/dev/null; then
  echo "${BRANCH} already contains prod"
  exit 0
fi

if git merge origin/prod --no-edit \
  -m "chore: auto-sync ${BRANCH} from prod on checkout"; then
  echo "=== Merged prod into ${BRANCH} ==="
else
  echo "Warning: merge from prod failed — resolve conflicts manually"
fi

exit 0
