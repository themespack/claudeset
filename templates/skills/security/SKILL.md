---
name: security
description: Authentication, authorisation, input handling, secrets and dependency risk. Use when touching auth, handling user input, storing credentials, or reviewing a change for security impact.
---

# Security

## Trust boundaries

Anything from a client is hostile until validated: body, query, headers,
cookies, file names, redirect targets. Validate at the edge with a schema, then
work with typed values.

Never build a query, shell command, path or HTML by string concatenation.
Parameterised queries, argument arrays, `path.resolve` plus an allow-list check,
and a templating layer that escapes by default.

## Authorisation

Authentication says who; authorisation says what. Check ownership on every
object access — an ID in a URL is a request, not a permission. Deny by default
and grant explicitly.

Do not rely on the UI hiding an action. Enforce it server-side.

## Secrets

Secrets live in the environment or a secret store, never in code, config
committed to git, logs, error messages or client bundles. Rotate anything that
has been printed or committed — assume it is public.

Never read `.env` files unless the user explicitly asks.

## Data handling

Hash passwords with argon2 or bcrypt, never a general-purpose hash. Compare
tokens with a constant-time function. Sign and expire anything that acts as a
capability. Log identifiers, not payloads; redact tokens and personal data.

## Dependencies

New dependency: check it is maintained, popular enough to be watched, and that
the standard library cannot do the job. Pin versions in a lockfile and keep an
audit step in CI.

## Reporting

When a finding is real, state the concrete attack: input, path through the code,
what the attacker gets. Rank by exploitability, not by category name.
