---
name: testing
description: What to test, at which level, and what to skip. Use when adding tests, fixing a failing suite, or deciding whether a change needs coverage.
---

# Testing

## What a test is for

A test pins behaviour someone depends on. If breaking the code would not break a
test, the test is not earning its keep — and if a test breaks every time the
implementation is tidied, it is testing the implementation.

## Levels

- **Unit** — pure logic, no I/O. Fast, many, cheap to keep.
- **Integration** — the module plus its real collaborators: the database, the
  router, the file system. Fewer, slower, catches wiring bugs unit tests cannot.
- **End to end** — a handful of critical user journeys. Expensive; reserve them
  for flows where failure is unacceptable.

Push tests down the pyramid when the same bug can be caught lower.

## Writing them

Name the behaviour, not the function: `rejects an expired token`, not
`test authenticate`. Arrange, act, assert — one behaviour per test.

Cover the boundary and the failure, not only the happy path: empty, one, many,
malformed, unauthorised, timeout.

Test through the public interface. Reaching into private state produces tests
that fail during refactoring and pass during breakage.

## Mocks

Mock what you do not own and cannot run: third-party APIs, clocks, randomness.
Do not mock your own modules to make a test easier — that usually means the
boundary is in the wrong place.

## When a test fails

Reproduce it first, then decide: is the test wrong or the code? Never delete or
skip a failing test to make a suite green without saying so explicitly.
