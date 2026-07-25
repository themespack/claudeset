# claudeset

Bootstrap [Claude Code](https://claude.com/claude-code) into any project — config,
project memory, an RTK prompt library, and optional Caveman mode. Idempotent and
safe to re-run.

```bash
npm install -g claudeset
cd my-project
claudeset init
```

## Install from GitHub

`dist/` is not committed; the build runs from the `prepare` script when npm
resolves the repo.

```bash
# as a project dependency
npm install github:themespack/claudeset

# globally, on a new machine
git clone https://github.com/themespack/claudeset.git
cd claudeset
npm install     # installs deps and builds dist/
npm link        # puts `claudeset` on your PATH
claudeset global
```

`npm install -g github:themespack/claudeset` is **not** reliable: npm 10 runs
`prepare` before installing the clone's dependencies, so the TypeScript build
fails. Use `npm link` (above) or install the published package from npm.

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
| `claudeset mcp`    | Manage MCP servers (project, Claude Code user scope, or Zed) |
| `claudeset global` | Share skills, instructions and MCP across every agent and project |
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

Add `--scope user` to configure the server machine-wide instead, for every
project you open:

```bash
claudeset mcp add gh "npx -y @modelcontextprotocol/server-github" --scope user
claudeset mcp list --scope user
claudeset mcp remove gh --scope user --target zed
```

| Scope / target | File | Key |
|---|---|---|
| `--scope project` (default) | `.mcp.json` | `mcpServers` |
| `--scope user --target claude` | `~/.claude.json` | `mcpServers` |
| `--scope user --target zed` | `~/.config/zed/settings.json` | `context_servers` |

`--target` defaults to `both`. Zed's `settings.json` is JSONC, so it is edited by
splicing text rather than re-serialising — your comments and formatting survive,
and the previous file is kept as `settings.json.claudeset.bak`. If the file can't
be parsed, claudeset prints the JSON to paste and changes nothing.

### Global setup (Zed, Claude Code, any agent)

```bash
claudeset global          # set it up
claudeset global --dry-run
claudeset global status   # check only, exits 1 when something is off
```

Config that lives in your home directory is loaded automatically every time the
editor starts — no per-project step, no daemon.

| What | Where |
|---|---|
| Skills, shared by both agents | `~/.agents/skills` → symlink to `~/.claude/skills` |
| Zed personal instructions | `~/.config/zed/AGENTS.md` |
| Claude Code global instructions | `~/.claude/CLAUDE.md` |

`global` never replaces an existing `~/.agents/skills` directory — if something
is already there it reports the conflict and stops. Instruction files are only
created when missing, so your edits are safe.

`global status` also flags skills without a `SKILL.md` (Zed requires each skill
to be a direct child of the skills root) and MCP servers configured for one
agent but not the other.

**Zed caveat:** Claude Agent running in Zed over ACP does not use Zed Skills or
Zed agent profiles — it reads `CLAUDE.md` and `~/.claude/skills` itself. Zed MCP
servers *may* be forwarded over ACP, which is why `--target both` is the default.

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
  skills/              # project skills, one folder + SKILL.md each
.agents/
  skills -> ../.claude/skills   # same skills, where Zed's agent looks
.mcp.json              # only when you add MCP servers
.caveman/              # only when Caveman is enabled/detected
```

### Skills

Project skills live in `.claude/skills/<name>/SKILL.md` and are committed with
the repo, so everyone gets the same ones. Personal skills stay in
`~/.claude/skills` (see `claudeset global`).

`.agents/skills` is a **relative** symlink to `.claude/skills` — Claude Code
reads the first path, Zed's agent reads the second, and one folder serves both.
Being relative, it survives a clone or a move. On Windows a directory junction
is used; if the platform refuses it, `init` says so and only Claude Code sees
the skills.

`claudeset doctor` reports how many skills are present and names any folder
missing its `SKILL.md` — those are silently skipped by both agents.

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

## Release

There is no CI. Verify locally before publishing:

```bash
npm run typecheck && npm test && npm run build
npm pack --dry-run     # confirm dist/ and templates/ are included
npm publish --access public
```

`npm publish` runs `build` first via `prepublishOnly`.

## License

MIT
