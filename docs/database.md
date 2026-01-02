# Database Plan (draft)

- **Cluster:** MongoDB Atlas via `MONGODB_URI` (provided by ops; never committed).
- **Multi-tenancy:** Every document stores `tenantId`; queries must filter by `tenantId`.
- **Auditing:** `createdAt`, `updatedAt`, `createdBy`, `updatedBy` on write models.

## Collections (initial phase)
- `auth_users` (auth-service): invite tokens, credentials, refresh tokens.
- `users` (users-service): profile, role (`ADMIN`, `TEAM_LEAD`, `EMPLOYEE`), tenantId, status.

## Indexes (planned)
- `auth_users`: `{ email: 1, tenantId: 1 }` unique.
- `users`: `{ tenantId: 1, email: 1 }` unique; `{ tenantId: 1, role: 1 }` for filters.

## Access Pattern Notes
- All queries include `tenantId` from JWT claims.
- Admins can act across tenant; team leads restricted to their teams (to be defined).
- No public signup; user creation only via invite/manager flow.


