# Agent instructions — claudeset

Rules for any AI agent working in this repository.

## Always

1. Read `.claude/memories/project.md` before starting.
2. Read `.claude/memories/architecture.md` before structural changes.
3. Update `.claude/memories/todo.md` after completing a major task.
4. Follow `.claude/memories/coding-style.md`.

## Never

- Overwrite or delete memory files wholesale.
- Commit secrets, `.env` files, or credentials.
- Introduce a dependency without noting it in `stack.md`.
- Add GitHub Actions workflows. This project does not use CI — see below.

## No CI

There is no `.github/workflows/` here, and none should be added. Verify
locally instead, and report the real output:

```bash
npm run typecheck && npm test && npm run build
```

If the project uses a different toolchain, use its equivalent and record the
command in `.claude/memories/stack.md`.

## Workflow

- Make the smallest change that solves the problem.
- Verify with tests/linters before reporting done.
- When uncertain, state assumptions instead of guessing silently.

<!-- Add agent-specific rules below. claudeset will not overwrite this file. -->
