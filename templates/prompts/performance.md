# @performance

Improve performance with evidence.

1. Measure first — identify the actual hot path, don't guess.
2. State the metric and target (latency, memory, throughput).
3. Find the dominant cost (N+1, allocations, blocking I/O, re-renders).
4. Fix the biggest cost first; re-measure.
5. Confirm no behavior/correctness regression.

Never optimize without a measurement backing it.
