/** RTK = Reusable Toolkit: standardized memory + prompt library. */

/** Memory files that make up the RTK project brain. */
export const RTK_MEMORY_FILES = [
  "architecture.md",
  "coding-style.md",
  "project.md",
  "stack.md",
  "todo.md",
] as const;

/** Standardized prompt library, addressable as @debug, @refactor, etc. */
export const RTK_PROMPT_FILES = [
  "debug.md",
  "refactor.md",
  "review.md",
  "design.md",
  "security.md",
  "performance.md",
] as const;

export const RTK_MEMORY_DIR = ".claude/memories";
export const RTK_PROMPT_DIR = ".claude/prompts";
