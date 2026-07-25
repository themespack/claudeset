---
name: documentation
description: Write docs that survive the next change. Use when writing a README, API docs, code comments, ADRs, or when asked to document a feature.
---

# Documentation

## Comment the why

Code says what it does. A comment earns its place by saying why: the constraint,
the trade-off, the bug that motivated the odd branch, the upstream behaviour
being worked around.

Delete comments that restate the line below them. Fix the name instead.

## README

A README answers, in this order: what this is, how to run it, how to develop on
it, how to deploy it. Every command must be copy-pasteable and actually work.

Prefer one accurate example over three prose paragraphs.

## API and function docs

Document the contract: parameters, return value, errors thrown, side effects,
and anything the caller must not do. Do not document types the signature already
states.

## Decisions

Record decisions that constrain future work — why this database, why this
boundary, why the obvious approach was rejected. A short dated note beats a long
document nobody updates.

## Keep it true

Documentation that lies is worse than none. When a change makes a doc wrong,
fixing it is part of that change, not a follow-up. If you cannot verify a claim,
do not write it.

Match the surrounding style: same voice, same heading depth, same terminology.
Do not introduce a second word for a concept the project already names.
