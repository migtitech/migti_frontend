#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${DEPLOY_BRANCH:?DEPLOY_BRANCH is required}"
: "${CI_JOB_TOKEN:?CI_JOB_TOKEN is required}"
: "${CI_SERVER_HOST:?CI_SERVER_HOST is required}"
: "${CI_PROJECT_PATH:?CI_PROJECT_PATH is required}"

export NVM_DIR="${HOME}/.nvm"
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh" || true

cd "${DEPLOY_PATH}"

git remote set-url origin "https://gitlab-ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git"
git fetch origin "${DEPLOY_BRANCH}"
git checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}" -f
git reset --hard "origin/${DEPLOY_BRANCH}"
git clean -fd

echo "Node $(node -v) NPM $(npm -v)"
echo "=== Installing dependencies ==="
npm install -f
echo "=== Building frontend ==="
npm run build
echo "=== Frontend deploy completed ${DEPLOY_PATH} ${DEPLOY_BRANCH} ==="
