# CRM Monorepo Architecture (Phase 1 draft)

## Overview
- Multi-tenant CRM SaaS with API gateway, backend microservices, and web frontend.
- MongoDB Atlas as shared cluster; each document is scoped by `tenantId` and audited with `createdBy` / `updatedBy`.
- JWT-based auth (access + refresh) with RBAC roles: `ADMIN`, `TEAM_LEAD`, `EMPLOYEE`.

## Monorepo Layout (initial)
- `apps/web-frontend`: Next.js dashboard (to be implemented).
- `gateway/api-gateway`: HTTP entrypoint and routing to services.
- `services/auth-service`: Auth, tokens, session handling.
- `services/users-service`: Tenant-scoped user management.
- `infrastructure`: docker-compose, future k8s manifests.
- `docs`: architecture, service specs.

## Data Flow (planned)
1) Frontend → API Gateway → Auth Service for login/refresh.
2) Auth Service issues JWTs; gateway enforces verification before proxying.
3) Users Service manages tenant users; only admins/team leads can invite.

## Multi-tenancy & RBAC (planned enforcement)
- Every auth/user record includes `tenantId`.
- Requests must include tenant context (from token claims) and role check.
- Admin: full access within tenant. Team Lead: manage their team/users they own. Employee: limited self/assigned resources.

## Phase 1 Definition of Done (incremental)
- Scaffolding for gateway, auth-service, users-service.
- MongoDB connectivity via `MONGODB_URI` env (no secrets committed).
- Basic login/signup by invitation (no public signup).
- Dockerfiles per service and a compose file for local dev.
- Initial tests for auth-service and users-service.


