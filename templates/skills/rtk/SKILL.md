---
name: rtk
description: Read the project memory and prompt library before acting. Use at the start of any task in this repo, and whenever a decision depends on stack, architecture or coding conventions.
---

# RTK — read the kit first

`{{projectName}}` keeps its durable context in files, not in chat history. Read
them before proposing anything.

## Order

1. `CLAUDE.md` — how to work in this repo.
2. `.claude/memories/stack.md` — languages, frameworks, package manager.
3. `.claude/memories/architecture.md` — module boundaries and data flow.
4. `.claude/memories/coding-style.md` — naming, error handling, test style.
5. `.claude/memories/project.md` — goals and constraints not visible in code.
6. `.claude/memories/todo.md` — what is already planned; do not duplicate it.

Read only what the task needs. A typo fix does not need the architecture file.

## Prompt library

`.claude/prompts/` holds reusable briefs: `debug`, `refactor`, `review`,
`design`, `security`, `performance`. When the user names one, follow that file
instead of improvising a structure.

## Keeping memory true

Memory files describe intent, not history. Update one when a decision changes
what future work should do — a new module boundary, a dropped dependency, a
convention the team agreed on. Do not record what git already knows: fixed bugs,
past refactors, file listings.

State conflicts out loud. If `coding-style.md` says one thing and the code does
another, say so and ask which wins rather than silently following either.
