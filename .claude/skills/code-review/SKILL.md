---
name: code-review
description: Review a diff for correctness before style. Use when asked to review code, a pull request or pending changes, or before committing a large change.
---

# Code review

Review what changed, in the order that finds real bugs fastest.

## Order

1. **Correctness** — does it do what it claims? Walk the happy path, then the
   edge cases: empty input, zero, negative, concurrent calls, partial failure.
2. **Boundaries** — off-by-one, null vs undefined, timezone, encoding, integer
   overflow, unhandled rejection.
3. **Security** — untrusted input reaching a query, a shell, a path, or HTML.
   Secrets in code or logs. Missing authorisation check.
4. **Fit** — does it match how the rest of the codebase does this? Duplicated
   logic that already exists elsewhere?
5. **Tests** — is the new behaviour covered, including the failure it fixes?
6. **Style** — last, and only what a linter cannot say.

## Reporting

Every finding needs a concrete failure: the input or state, and the wrong
result. "This could be cleaner" is not a finding; "empty `items` divides by zero
at line 42" is.

Rank by severity. Say plainly when a diff is fine — an empty review is a valid
result, and padding it with nits wastes the author's time.

Separate what you verified from what you suspect. If you did not run the tests,
say so.

## What not to flag

Pre-existing problems the diff did not touch, unless they are dangerous. Style
the formatter already owns. Personal preference about naming when the codebase
is consistent with itself.
