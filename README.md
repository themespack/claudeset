# claudeset

Bootstrap [Claude Code](https://claude.com/claude-code) into any project — config,
project memory, an RTK prompt library, and optional Caveman mode. Idempotent and
safe to re-run.

```bash
npm install -g claudeset
cd my-project
claudeset init
```

## Why

Every new project needs the same Claude Code foundation: a `CLAUDE.md`, an
`AGENTS.md`, a `.claude/` config, and a durable project memory. `claudeset`
scaffolds all of it in one command, detects your framework, and **never
overwrites** what you already have.

## Commands

| Command | Purpose |
|---------|---------|
| `claudeset init`   | Scaffold the full setup into the current project |
| `claudeset doctor` | Health-check config, memory, and prompts |
| `claudeset repair` | Recreate missing files without overwriting existing ones |
| `claudeset update` | Refresh managed templates (prompt library, settings) |
| `claudeset memory` | List memory files and create missing ones |
| `claudeset mcp`    | Manage project-scoped MCP servers (`.mcp.json`) |
| `claudeset hooks`  | Manage Claude Code hooks via presets |
| `claudeset clean`  | Remove generated files (regenerable ones by default) |

### `init` flags

```
-f, --force       overwrite existing files
-y, --yes         skip confirmation
    --dry-run     preview changes, write nothing
    --no-rtk      skip RTK memory + prompts
    --caveman     force-enable Caveman scaffolding
    --no-caveman  disable Caveman scaffolding
```

### MCP servers

```bash
claudeset mcp list
claudeset mcp add gh "npx -y @modelcontextprotocol/server-github"
claudeset mcp remove gh
```

Writes to `.mcp.json` at the project root. Adding the same server twice is a
no-op.

### Hooks

```bash
claudeset hooks list              # configured hooks + available presets
claudeset hooks add typecheck
```

| Preset | What it does |
|--------|--------------|
| `prettier`    | Format edited JS/TS files after each `Edit`/`Write` |
| `typecheck`   | Run `tsc --noEmit` when the agent stops |
| `protect-env` | Warn before the agent reads a `.env` file |

Hooks are merged into `.claude/settings.json`; your existing keys are untouched.

### Clean

```bash
claudeset clean            # removes regenerable files only, asks first
claudeset clean --dry-run  # preview
claudeset clean --all      # also CLAUDE.md, AGENTS.md, settings, memories
```

By default `clean` removes only claudeset-owned, regenerable files
(`.claude/prompts/`, `RTK.md`, `.caveman/`, the generated command) — **never
your memory files**. `claudeset repair` puts them all back.

## What it creates

```
CLAUDE.md              # project guidance for Claude Code
AGENTS.md              # agent rules
RTK.md                 # explains the memory + prompt system
.editorconfig
.gitignore
.claude/
  settings.json        # merged, never clobbered
  commands/
  memories/            # architecture, coding-style, stack, project, todo
  prompts/             # @debug @refactor @review @design @security @performance
.mcp.json              # only when you add MCP servers
.caveman/              # only when Caveman is enabled/detected
```

## Idempotency

- Docs & memory files: **created only if absent** (`skipped` otherwise).
- `.claude/settings.json`: **deep-merged**, filling missing keys only.
- `CLAUDE.md` / `AGENTS.md`: user content is never touched; a fenced
  `claudeset` block can be refreshed with `update --force`.

Re-run `claudeset init` any time — it only fills gaps unless you pass `--force`.

## Develop

```bash
npm install
npm run dev -- init --dry-run   # run from source
npm test                        # unit tests
npm run build                   # emit dist/
```

## License

MIT
