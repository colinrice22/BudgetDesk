# ADR 0001: Store Currency as Integer Cents

Status: Accepted

Decision:
All monetary values are represented as integer cents in transport, storage, and business logic. Decimal conversion is presentation-only.

Consequences:
- No floating-point drift in allocations and rollups.
- Shared helper utilities are required for formatting and parsing.
