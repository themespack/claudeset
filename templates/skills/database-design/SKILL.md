---
name: database-design
description: Schema, indexes, constraints and migrations. Use when adding a table or column, designing a data model, writing a migration, or debugging a slow query.
---

# Database design

## Schema

Let the database enforce truth: `NOT NULL`, foreign keys, `UNIQUE`, and `CHECK`
constraints. Application-level validation is a convenience, not a guarantee —
two processes will race.

Normalise first. Denormalise only with a measured read problem and a written
plan for keeping the copy in sync.

Choose types deliberately: `timestamptz` not `timestamp`, `numeric` for money
never `float`, native `uuid` or `bigint` for keys, an enum or a lookup table for
a closed set.

Prefer soft state to soft deletes. If rows must survive deletion, model the
lifecycle explicitly (`status`, `archived_at`) and keep queries honest about it.

## Indexes

Index what you filter, join and sort on — in that column order. A composite
index serves any prefix of its columns, so `(tenant_id, created_at)` covers
`tenant_id` alone.

Every index costs write throughput. Read the query plan before adding one, and
again after, to confirm it is used.

## Migrations

Migrations are forward-only, small, and reversible in principle. Never edit a
migration that has run anywhere.

Expand then contract for anything breaking: add the new column, backfill in
batches, switch reads, switch writes, drop the old column in a later release.

Long locks take production down: create indexes concurrently, avoid rewriting
large tables in a single statement, and set a lock timeout.

## Queries

Fetch the columns you need. Paginate by cursor, not `OFFSET`, once the table is
large. Wrap multi-statement changes in a transaction and keep it short.
