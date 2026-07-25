---
name: typescript
description: Type-level conventions for this codebase — narrow, infer, avoid any. Use when writing or reviewing TypeScript, designing types, or fighting a compiler error.
---

# TypeScript

Types exist to make wrong states unrepresentable, not to decorate code.

## Rules

- No `any`. When a type is genuinely unknown, use `unknown` and narrow it.
- Let inference work. Annotate function parameters, return types on exported
  functions, and nothing else that the compiler already knows.
- Model unions, not optional soup: `{ status: "ok"; data: T } | { status: "err";
  error: E }` beats `{ data?: T; error?: E }`.
- `as` is a claim you are overriding the compiler. Each one needs a reason, and
  `as unknown as X` needs a very good one.
- Prefer `type` for unions and object shapes; `interface` when it is extended or
  merged.
- `readonly` on anything you do not intend callers to mutate.

## Narrowing

Discriminated unions plus a `switch` give exhaustiveness for free:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled: ${JSON.stringify(x)}`);
}
```

Add it to the `default` branch so a new variant becomes a compile error.

## Boundaries

Data crossing a boundary — HTTP, files, env, `JSON.parse` — is `unknown` until
validated. Parse it once at the edge into a domain type; do not sprinkle casts
downstream.

## Compiler settings

`strict` stays on. If a change needs it off, that is a design problem, not a
config problem. Fix the type, or isolate the untyped part behind one narrow
module and document why.
