# Security Checklist Draft

- Store money as integer cents only.
- Hash passwords with Argon2id or bcrypt.
- Enforce server-side validation on every payload.
- Use secure session handling (httpOnly cookie or hardened JWT flow).
- Enforce RLS policies on all user-owned tables.
