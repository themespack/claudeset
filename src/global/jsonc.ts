/**
 * Minimal JSONC helpers.
 *
 * Zed's `settings.json` is JSON with comments and trailing commas, and users keep
 * hand-written notes in it. Rewriting it through `JSON.stringify` would delete those,
 * so edits here are surgical: we mask comments to *equal-length* whitespace, scan the
 * masked copy for offsets, and splice text into the original.
 */

/** Replace comments with spaces, preserving every offset in the original text. */
export function maskComments(input: string): string {
  const out = input.split("");
  let i = 0;
  let inString = false;
  while (i < input.length) {
    const c = input[i];
    if (inString) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      i++;
      continue;
    }
    if (c === "/" && input[i + 1] === "/") {
      while (i < input.length && input[i] !== "\n") out[i++] = " ";
      continue;
    }
    if (c === "/" && input[i + 1] === "*") {
      const end = input.indexOf("*/", i + 2);
      const stop = end === -1 ? input.length : end + 2;
      while (i < stop) {
        if (input[i] !== "\n") out[i] = " ";
        i++;
      }
      continue;
    }
    i++;
  }
  return out.join("");
}

/** Parse JSONC (comments + trailing commas tolerated). Returns null when invalid. */
export function parseJsonc<T = Record<string, unknown>>(text: string): T | null {
  const masked = maskComments(text);
  const noTrailing = stripTrailingCommas(masked);
  try {
    return JSON.parse(noTrailing) as T;
  } catch {
    return null;
  }
}

function stripTrailingCommas(masked: string): string {
  const out = masked.split("");
  let inString = false;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (inString) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c !== ",") continue;
    let j = i + 1;
    while (j < masked.length && /\s/.test(masked[j])) j++;
    if (masked[j] === "}" || masked[j] === "]") out[i] = " ";
  }
  return out.join("");
}

/** Index of the root `{`, or -1 when the text is not an object. */
export function rootBrace(masked: string): number {
  const idx = masked.search(/\S/);
  return idx !== -1 && masked[idx] === "{" ? idx : -1;
}

/** Index of the `{` or `[` closing the one at `openIdx`. */
export function matchBrace(masked: string, openIdx: number): number {
  const open = masked[openIdx];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (let i = openIdx; i < masked.length; i++) {
    const c = masked[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return i;
  }
  return -1;
}

/** Offset of the value belonging to a top-level `"key"`, or -1 when absent. */
export function topLevelValueStart(masked: string, key: string): number {
  const root = rootBrace(masked);
  if (root === -1) return -1;
  return memberValueStart(masked, root, key);
}

/** Offset of the value of `"key"` inside the object opened at `openIdx`, or -1. */
export function memberValueStart(masked: string, openIdx: number, key: string): number {
  const needle = JSON.stringify(key);
  let depth = 0;
  let inString = false;
  for (let i = openIdx; i < masked.length; i++) {
    const c = masked[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      if (depth === 1 && masked.startsWith(needle, i)) {
        let j = i + needle.length;
        while (j < masked.length && /\s/.test(masked[j])) j++;
        if (masked[j] === ":") {
          j++;
          while (j < masked.length && /\s/.test(masked[j])) j++;
          return j;
        }
      }
      inString = true;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      if (--depth === 0) return -1;
    }
  }
  return -1;
}

/** Leading whitespace of the line containing `idx`. */
export function lineIndent(text: string, idx: number): string {
  const start = text.lastIndexOf("\n", idx) + 1;
  const match = /^[ \t]*/.exec(text.slice(start, idx));
  return match ? match[0] : "";
}

/** The indentation unit used by the file (defaults to two spaces). */
export function detectIndent(text: string): string {
  const match = /\n([ \t]+)"/.exec(text);
  return match ? match[1] : "  ";
}

/** Render a value as JSON, every line after the first prefixed with `indent`. */
export function indentJson(value: unknown, indent: string, unit: string): string {
  return JSON.stringify(value, null, unit)
    .split("\n")
    .map((line, i) => (i === 0 ? line : indent + line))
    .join("\n");
}

/** True when the object opened at `openIdx` holds no members. */
export function isEmptyObject(masked: string, openIdx: number): boolean {
  const close = matchBrace(masked, openIdx);
  if (close === -1) return false;
  return masked.slice(openIdx + 1, close).trim() === "";
}

/**
 * Insert `"key": value` as the first member of the object opened at `openIdx`,
 * keeping the file's existing formatting.
 */
export function insertMember(
  text: string,
  openIdx: number,
  key: string,
  value: unknown,
  unit: string,
): string {
  const masked = maskComments(text);
  const baseIndent = lineIndent(text, openIdx);
  const memberIndent = baseIndent + unit;
  const rendered = `${JSON.stringify(key)}: ${indentJson(value, memberIndent, unit)}`;
  const empty = isEmptyObject(masked, openIdx);
  const close = matchBrace(masked, openIdx);

  if (empty) {
    return (
      text.slice(0, openIdx + 1) +
      `\n${memberIndent}${rendered}\n${baseIndent}` +
      text.slice(close)
    );
  }
  return (
    text.slice(0, openIdx + 1) +
    `\n${memberIndent}${rendered},` +
    text.slice(openIdx + 1)
  );
}

/** Replace the value spanning `[start, end)` with freshly rendered JSON. */
export function replaceValue(
  text: string,
  start: number,
  end: number,
  value: unknown,
  unit: string,
): string {
  const indent = lineIndent(text, start);
  return text.slice(0, start) + indentJson(value, indent, unit) + text.slice(end);
}
