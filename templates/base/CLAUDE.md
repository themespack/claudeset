# {{projectName}}

> Scaffolded by [claudeset](https://github.com/themespack/claudeset). Safe to edit.

Project guidance for Claude Code. Keep this file short and high-signal.

- **Framework:** {{framework}}
- **Language:** {{language}}
- **Package manager:** {{packageManager}}

## Memory

Before making architectural decisions, read the project memory in
`.claude/memories/`:

- `architecture.md` — how the system is structured and why
- `coding-style.md` — conventions to follow
- `stack.md` — languages, frameworks, tools
- `project.md` — goals, scope, constraints
- `todo.md` — running task list

Update `todo.md` after finishing a major task. Never overwrite memory files
wholesale — append or edit in place.

## Prompt library (RTK)

Reusable prompts live in `.claude/prompts/` and are addressable inline, e.g.
`@debug`, `@review`, `@security`.

## Conventions

- Match the style of surrounding code.
- Prefer small, verifiable changes.
- Run the project's tests/linters before declaring work done.
- **No CI.** Do not add GitHub Actions workflows — verify locally instead.

<!-- Add project-specific rules below. claudeset will not overwrite this file. -->
