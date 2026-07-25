---
name: cloudflare-workers
description: Cloudflare Workers runtime limits, bindings and deployment. Use when writing or reviewing Worker code, wrangler config, or anything touching KV, D1, R2, Durable Objects or Queues.
---

# Cloudflare Workers

## Runtime shape

Workers run on V8 isolates, not Node. There is no filesystem and no long-lived
process. Assume the isolate can be recycled between requests: never keep request
state in module-level variables, and never cache per-user data globally.

Everything the Worker touches arrives through `env` bindings — KV, D1, R2, Queues,
Durable Objects, secrets. No `process.env`, no credentials in code.

## Async discipline

Do not float promises. Work that must outlive the response goes through
`ctx.waitUntil(...)`; anything else is awaited. An unawaited promise is silently
cancelled when the request ends.

CPU time is bounded per request. Long or bursty work belongs in a Queue consumer,
a Workflow, or a Durable Object alarm.

## Streaming

Return a `Response` as soon as the first bytes exist. Buffering a large body to
build a string burns memory and delays time-to-first-byte.

## Storage choice

- **KV** — read-heavy, eventually consistent, cache-like.
- **D1** — relational queries, single-region primary.
- **R2** — blobs, no egress fees.
- **Durable Object** — strong consistency and coordination for one key at a time.

## Config and deploy

`wrangler.jsonc` is the source of truth: bindings, compatibility date,
observability. Set `compatibility_date` deliberately and keep observability on.
Secrets go through `wrangler secret put`, never into the config file.

Test with Vitest and the Workers pool so tests run in the real runtime.
