---
name: api-design
description: Resource naming, status codes, versioning and error shapes. Use when adding or changing an HTTP endpoint, designing a public API, or reviewing an API contract.
---

# API design

## Resources

Name resources as plural nouns; put the verb in the method.
`POST /invoices`, `GET /invoices/{id}`, `PATCH /invoices/{id}`. Actions that are
genuinely not CRUD get a sub-resource: `POST /invoices/{id}/refunds`.

Nest only one level deep. Beyond that, use query parameters and a flat path.

## Status codes

`200` returns a body, `201` returns the created resource plus `Location`, `204`
returns nothing. `400` is malformed, `401` is unauthenticated, `403` is
authenticated but not allowed, `404` hides existence, `409` is a state conflict,
`422` is semantically invalid, `429` is rate limited.

Never return `200` with `{"error": ...}` inside.

## Errors

One shape everywhere, machine-readable first:

```json
{ "error": { "code": "invoice_already_paid", "message": "...", "details": {} } }
```

`code` is stable and documented; `message` is for humans and may change. Never
leak stack traces, SQL or internal hostnames.

## Payloads

Lists are paginated from day one — cursor pagination for anything that grows.
Return an envelope with the items and the cursor, not a bare array.

Be strict about what you accept and explicit about what you return. Unknown
fields in a request are rejected, not silently ignored.

## Change safely

Additive changes are free: new optional fields, new endpoints. Removing a field,
renaming one, or tightening validation is breaking — version it (`/v2`) or
migrate consumers first, and give a deprecation window with a header.

Idempotency keys on anything that moves money or creates records.
