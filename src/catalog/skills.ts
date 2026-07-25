export interface SkillEntry {
  id: string;
  title: string;
  /** One line, shown in the picker. */
  description: string;
}

/**
 * Skills shipped with claudeset. Each one has a template at
 * `templates/skills/<id>/SKILL.md` and is copied into `.claude/skills/<id>/`.
 */
export const SKILL_CATALOG: SkillEntry[] = [
  { id: "rtk", title: "RTK", description: "Read the memory files and prompt library before acting." },
  { id: "caveman", title: "Caveman", description: "Ultra-terse replies that keep every technical detail." },
  {
    id: "clean-architecture",
    title: "Clean Architecture",
    description: "Keep domain logic free of framework and I/O concerns.",
  },
  { id: "code-review", title: "Code Review", description: "Review a diff for correctness before style." },
  { id: "refactoring", title: "Refactoring", description: "Change structure in small steps without changing behaviour." },
  { id: "typescript", title: "TypeScript", description: "Type-level conventions: narrow, infer, avoid any." },
  { id: "react", title: "React", description: "Component, state and effect rules that avoid re-render bugs." },
  { id: "tanstack", title: "TanStack", description: "Query, Router and Table conventions." },
  {
    id: "cloudflare-workers",
    title: "Cloudflare Workers",
    description: "Workers runtime limits, bindings and deployment.",
  },
  { id: "api-design", title: "API Design", description: "Resource naming, status codes, versioning, errors." },
  { id: "security", title: "Security", description: "Authn/authz, input handling, secrets, dependency risk." },
  { id: "performance", title: "Performance", description: "Measure first, then fix the dominant cost." },
  { id: "testing", title: "Testing", description: "What to test, at which level, and what to skip." },
  { id: "documentation", title: "Documentation", description: "Write docs that survive the next change." },
  { id: "git-workflow", title: "Git Workflow", description: "Branches, commit messages, rebases and reverts." },
  { id: "database-design", title: "Database Design", description: "Schema, indexes, constraints and migrations." },
  { id: "debugging", title: "Debugging", description: "Reproduce, bisect, instrument — guess last." },
];

export function findSkill(id: string): SkillEntry | undefined {
  return SKILL_CATALOG.find((e) => e.id === id);
}
