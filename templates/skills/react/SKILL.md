---
name: react
description: Component, state and effect rules that avoid re-render and stale-closure bugs. Use when writing or reviewing React components, hooks, or debugging renders.
---

# React

## State

Keep state minimal and derived values derived. If it can be computed from props
or other state during render, compute it — do not mirror it into `useState`.

Lift state only as far as the nearest common owner. State that lives too high
re-renders subtrees that do not care.

Never mutate state; produce new objects. Mutation is why a component "does not
update".

## Effects

`useEffect` is for synchronising with something outside React: subscriptions,
timers, imperative DOM APIs, network requests you own. It is **not** for
transforming data for render, and not for reacting to a prop change you could
handle in an event handler.

Every effect declares its full dependency list. If a dependency is a function or
object, memoise it or move it inside the effect — do not silence the linter.

Return a cleanup function for anything that can outlive the component.

## Re-renders

An inline object, array or arrow function is a new reference every render. That
is harmless for a DOM child and a re-render trigger for a memoised one. Reach
for `useMemo` / `useCallback` when a reference crosses a `memo` boundary or an
effect's dependency list — not by default.

Measure with the Profiler before optimising. Most "slow React" is one component
rendering a large list without keys or virtualisation.

## Keys

Keys must be stable and identity-bearing. Array index as a key corrupts state
when the list reorders.
