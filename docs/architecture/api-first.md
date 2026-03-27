# API-First Notes

- Keep clients thin and push invariants to API + shared domain layer.
- Support REST endpoints now, preserve schema boundaries for GraphQL later.
- Treat sync as first-class: idempotent writes, conflict metadata, retry-safe APIs.
