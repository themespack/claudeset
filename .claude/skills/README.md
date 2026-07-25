# Project skills

Skills that ship with **claudeset** — checked into the repo, so everyone
working on it gets the same ones. Personal skills belong in `~/.claude/skills`
instead.

One skill per folder, a direct child of this directory (nesting is not
supported), each with a `SKILL.md`:

```
.claude/skills/
  run-migrations/
    SKILL.md
    reference.md      # optional extra files the skill can point to
```

```markdown
---
name: run-migrations
description: Apply and roll back database migrations. Use when the user mentions migrations, schema changes or seeding.
---

Steps, commands and gotchas go here.
```

`name` must be lowercase with hyphens and match the folder name. `description`
is what the agent matches against, so say *when* to use the skill, not only what
it does.

`../.agents/skills` is a symlink to this folder, which is how Zed's agent finds
these same skills. Claude Code reads this folder directly.

Run `claudeset doctor` to check that every skill here is loadable.
