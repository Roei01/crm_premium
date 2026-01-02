# Auth Service (draft)

- **Purpose:** Handle login, refresh tokens, and invitation-based signup for tenants.
- **Language/Framework:** Node.js + TypeScript (planned).
- **Env Vars:** `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`.
- **Endpoints (planned):**
  - `POST /auth/login` — email/password -> access + refresh tokens.
  - `POST /auth/refresh` — refresh token -> new access token.
  - `POST /auth/invite` — admin/team lead invites user (generates token).
  - `POST /auth/accept-invite` — create account via invite token.
- **Tests:** Jest unit/integration (to be added).
- **Run tests:** `npm test` inside `services/auth-service` (once implemented).


