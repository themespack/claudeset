# Agent instructions — {{projectName}}

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

## Workflow

- Make the smallest change that solves the problem.
- Verify with tests/linters before reporting done.
- When uncertain, state assumptions instead of guessing silently.

<!-- Add agent-specific rules below. claudeset will not overwrite this file. -->
