---
name: performance
description: Measure first, then fix the dominant cost. Use when something is slow, when asked to optimise, or when reviewing a change for performance impact.
---

# Performance

## Measure before changing

Never optimise from intuition. Get a number: a profile, a timer around the
suspect block, a query plan, a flame graph. Write the baseline down so the
improvement is provable.

Optimise the dominant cost. A 90% win on 2% of runtime is noise.

## Usual suspects, in order

1. **N+1 queries** — a loop issuing one query per item. Batch or join.
2. **Missing index** — check the query plan for a sequential scan on a large
   table.
3. **Work repeated per request** that could be cached or precomputed.
4. **Serial awaits** that could run concurrently (`Promise.all`).
5. **Oversized payloads** — sending fields nobody reads, or unbounded lists.
6. **Algorithmic blowup** — quadratic loops over data that grew.

## Caching

Cache last, not first. Every cache introduces staleness and an invalidation bug.
Know the key, the TTL, and who invalidates it before adding one.

## Frontend

Time-to-interactive is dominated by bytes and blocking work: bundle size, render-
blocking requests, unvirtualised lists, layout thrash. Core Web Vitals (LCP, INP,
CLS) are the target, not synthetic micro-benchmarks.

## Report honestly

Give before and after numbers with the conditions that produced them. If the
change is within measurement noise, say that instead of claiming a win.
