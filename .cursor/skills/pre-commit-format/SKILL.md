---
name: pre-commit-format
description: Run Prettier before git commits in migti_frontend and migti_backend. Use when the user asks to commit, push, deploy, or open a merge request, or when preparing code changes for review.
---

# Pre-commit format

Before creating any git commit in this workspace:

1. Run formatting in each repo that has staged or unstaged changes:
   - `npm run format` in `migti_frontend`
   - `npm run format` in `migti_backend`
2. If Prettier modifies files, include those changes in the same commit.
3. Then follow the normal commit workflow (`git status`, `git diff`, commit message, push).

Run formatting even when only one repo changed, as long as that repo has edits to commit.
