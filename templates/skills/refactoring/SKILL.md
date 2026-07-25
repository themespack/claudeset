---
name: refactoring
description: Change structure in small steps without changing behaviour. Use when asked to clean up, simplify, extract, rename or restructure existing code.
---

# Refactoring

Refactoring changes structure, not behaviour. If the output changes, it is a
rewrite — say so and get agreement first.

## Before touching anything

Make sure behaviour is pinned. Run the tests. If the code has none and the
change is risky, write a characterisation test that captures what it does today
(bugs included), then refactor, then fix the bug as a separate change.

## Steps

Work in commits that each keep the suite green:

1. Rename for clarity — cheap, reversible, no logic moves.
2. Extract a function or module; leave the call site identical.
3. Move the extracted piece to where it belongs.
4. Delete what is now dead.

Never mix a behaviour change into a structural commit. Reviewers cannot see a
bug hiding inside a 400-line move.

## Worth doing

- The same logic in three places, drifting apart.
- A function whose name lies about what it does.
- A conditional nest deep enough that the happy path is invisible.
- A module everything imports and nothing owns.

## Not worth doing

- Code nobody reads and nothing changes.
- Abstractions built for one caller "in case" a second appears.
- Rewriting to a pattern the rest of the codebase does not use — consistency
  beats local elegance.

Stop when the code is clear. Do not keep refactoring past the point of the task.
