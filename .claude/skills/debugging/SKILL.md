---
name: debugging
description: Reproduce, bisect, instrument — guess last. Use when chasing a bug, an intermittent failure, a crash, or output that does not match expectations.
---

# Debugging

## Reproduce first

A bug you cannot reproduce is a bug you cannot verify fixed. Nail down the exact
input, environment and sequence. Shrink it: remove steps until removing one more
makes the bug disappear.

Write the reproduction as a failing test when you can. It becomes the proof.

## Read the actual error

Read the whole stack trace, including the cause chain, and the first error — not
the last one. Later failures are usually consequences.

Quote the exact message when reporting. A paraphrased error is unsearchable.

## Narrow the search

- **Bisect in time**: `git bisect` between a good and a bad commit.
- **Bisect in space**: cut the system in half — is the wrong value already wrong
  at the boundary, or does it go bad downstream?
- **Check assumptions**: print or breakpoint the value you are *certain* about.
  It is usually the certain one that is wrong.

## Instrument, do not guess

Add logging around state transitions and boundaries, not everywhere. A debugger
beats scattered prints when state is complex; prints beat a debugger for timing
and concurrency.

## Intermittent failures

Suspect order dependence, shared state, time zones, clock resolution, network
retries and unawaited promises. Run the test in isolation and in a loop to tell
flaky from broken.

## Finish honestly

Explain the root cause, not just the patch. If you fixed the symptom because the
cause is out of scope, say so plainly and note what remains.
