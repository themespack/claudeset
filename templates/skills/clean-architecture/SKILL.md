---
name: clean-architecture
description: Keep domain logic free of framework and I/O concerns. Use when adding a feature that spans layers, when deciding where code belongs, or when business rules are tangled with HTTP, ORM or UI code.
---

# Clean architecture

Dependencies point inward. Domain code knows nothing about HTTP, the ORM, the
queue or the UI; the outer layers know about the domain.

## Layers

- **Domain** — entities, value objects, business rules. Pure functions and plain
  data. No imports from frameworks.
- **Application** — use cases that orchestrate domain objects. Depends on
  *interfaces* for storage and external services, not implementations.
- **Adapters** — HTTP handlers, database repositories, API clients, CLI. They
  translate between the outside world and the application layer.

## Where does this code go?

Ask what breaks it. If a rule changes when the business changes, it is domain.
If it changes when you swap Postgres for SQLite, it is an adapter. If it changes
when the endpoint shape changes, it is an adapter too.

## Practical rules

- Pass data in and out, not ORM models or request objects.
- Define the interface next to the use case that needs it, implement it in the
  adapter layer. The use case owns the contract.
- Errors from adapters get translated at the boundary; the domain raises its own
  errors, in its own vocabulary.
- No global state or singletons reaching into the domain — inject dependencies.

## Do not over-apply

A CRUD endpoint with no rules does not need three layers. Introduce a boundary
when a rule needs to be tested without I/O, or when a second adapter appears.
Say so when the ceremony would cost more than it saves.
