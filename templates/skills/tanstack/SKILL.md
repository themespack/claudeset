---
name: tanstack
description: TanStack Query, Router and Table conventions. Use when fetching server state, defining routes, or building data tables with the TanStack libraries.
---

# TanStack

## Query

Server state belongs to Query, not to `useState` + `useEffect`.

- Query keys are arrays that describe the data: `["invoices", { status, page }]`.
  Everything the query depends on goes in the key — that is the cache identity.
- Centralise keys in one factory module so invalidation cannot drift from
  fetching.
- `staleTime` is the real knob. The default of `0` refetches constantly; set it
  to how long the data is actually good for.
- Mutations invalidate keys; they do not hand-patch the cache unless you need
  optimistic UI, and then they roll back in `onError`.
- Do not destructure `data` without handling `isPending` and `isError`. An
  error boundary plus `throwOnError` is fine for unexpected failures.

## Router

Routes own their data. Load in the route's `loader` so navigation and fetching
overlap instead of waterfalling in a child effect.

Validate search params with a schema at the route definition; downstream code
then reads typed params instead of parsing strings.

## Table

Keep the table headless: the library owns row model, sorting and pagination;
your components own markup. Derive columns from a typed accessor helper so a
renamed field is a compile error.

For server-side data, set `manualPagination` / `manualSorting` and pass state
into the Query key — otherwise the table sorts one page instead of the dataset.
