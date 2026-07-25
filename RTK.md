# RTK — Reusable Toolkit

RTK standardizes two things for Claude Code in this project:

## 1. Memory (`.claude/memories/`)

A small, durable "project brain" the agent reads before acting:

| File | Purpose |
|------|---------|
| `architecture.md` | System structure and the reasoning behind it |
| `coding-style.md`  | Conventions, formatting, naming |
| `stack.md`         | Languages, frameworks, tooling, versions |
| `project.md`       | Goals, scope, constraints, non-goals |
| `todo.md`          | Running task list, updated after each major task |

## 2. Prompt library (`.claude/prompts/`)

Standardized prompts, addressable inline as `@name`:

`@debug` · `@refactor` · `@review` · `@design` · `@security` · `@performance`

## Commands

```bash
claudeset memory   # list memory files, create missing ones
claudeset doctor   # verify memory + prompts are present
claudeset update   # refresh the prompt library to latest
```
