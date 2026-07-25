---
name: git-workflow
description: Branches, commit messages, rebases, reverts and release hygiene. Use when committing, opening a pull request, resolving a conflict, or recovering from a bad git state.
---

# Git workflow

## Commits

One logical change per commit. Formatting, renames and behaviour changes go in
separate commits — a reviewer cannot see a bug inside a 500-line reformat.

Conventional style, imperative mood, and a body that explains *why*:

```
fix(auth): treat token expiry as inclusive

Sessions ending exactly on the boundary were rejected because the check
used `<` instead of `<=`.
```

Subject under ~72 characters, no trailing period. Never commit secrets,
generated artefacts, or debugging leftovers.

## Branches

Branch off the default branch, one topic per branch: `feat/invoice-refunds`,
`fix/token-expiry`. Keep it short-lived — rebase on the default branch often so
conflicts stay small.

Never rewrite history that others have pulled. Force-push only to your own
topic branch, and only with `--force-with-lease`.

## Pull requests

Describe the problem, the approach, and how it was verified. Link the issue.
Small PRs get reviewed properly; a 2000-line PR gets rubber-stamped.

## Recovering

`git reflog` is the undo history — almost nothing is truly lost. Prefer
`git revert` on shared branches over `reset`, because it keeps history honest.

Ask before anything destructive: force-push, `reset --hard`, dropping stashes,
deleting a remote branch.
