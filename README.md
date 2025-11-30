# Boilerplate Template

This directory contains a minimal full-stack template extracted from the main project.
It provides:

- A lightweight Express backend with session-based authentication (no LDAP/DB connectivity).
- A React frontend with a login screen and a protected dashboard shell.
- Placeholder utilities and documentation you can extend for real data stores and business logic.

## Structure

- `back/` - Express server, authentication routes, and example protected API.
- `front/` - React application with login form, route guard, and dashboard layout shell.

Both applications are intentionally stripped from database configuration, external
connectors, and feature-specific controllers. Replace the placeholder logic with
your own services when integrating into a real system.

## Docker

For a portable setup, use Docker Compose (MariaDB + API + frontend):

1. Copy `.env.example` to `.env` at the repo root and adjust values if needed.
2. Build and start everything: `docker compose up --build -d`
3. Frontend: http://localhost:3000 (served by Nginx)
4. API: http://localhost:8080 (`/health` for a quick check), DB exposed on `${DB_PORT:-3307}`

Notes:
- Compose auto-loads the schema/seed files from `back/config/schema.sql` and `back/config/seed_pallets.sql` into MariaDB on the first run.
- Uploaded tariff documents are persisted in the `back_public` volume (`back/public` inside the container).
- Override `FRONT_API_BASE_URL` (build arg) or `CLIENT_ORIGIN` (API env) to point the UI/API to other hosts when deploying elsewhere.

## Quick Start

1. Copy `.env.example` to `.env` in both `back/` and `front/`, then adjust values.
2. Install dependencies:
   - `cd back && npm install`
   - `cd ../front && npm install`
3. Run the backend (default port `8080`): `npm run dev`
4. In a separate terminal, run the frontend (default port `3000`): `npm start`

The frontend expects the backend at `http://localhost:8080` by default. Sessions
are stored in signed cookies with no external persistence.

## Extending

- Replace the demo credential validation in `back/controllers/authController.js`
  with your own authentication provider.
- Add new protected routes under `back/routes/apiRoutes.js` and extend the
  dashboard UI in `front/src/components/dashboard/Dashboard.jsx`.
- Wire real data fetching through the `apiClient` helper in the frontend.

Feel free to tailor the folder structure and tooling to match your deployment
needs.
