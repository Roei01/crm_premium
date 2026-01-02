# Users Service (draft)

- **Purpose:** Manage tenant-scoped users and roles; only admins/team leads can create users.
- **Language/Framework:** Node.js + TypeScript (planned).
- **Env Vars:** `MONGODB_URI`.
- **Endpoints (planned):**
  - `GET /users` — list users for tenant.
  - `POST /users` — create user (restricted to admin/team lead).
  - `PATCH /users/:id` — update role/status within tenant.
- **Tests:** Jest unit/integration (to be added).
- **Run tests:** `npm test` inside `services/users-service` (once implemented).


