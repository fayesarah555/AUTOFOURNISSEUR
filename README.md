# Boilerplate Template

This directory contains a minimal full‑stack template extracted from the main project.
It provides:

- A lightweight Express backend with session‑based authentication (no LDAP/DB connectivity).
- A React frontend with a login screen and a protected dashboard shell.
- Placeholder utilities and documentation you can extend for real data stores and business logic.

## Structure

- `back/` – Express server, authentication routes, and example protected API.
- `front/` – React application with login form, route guard, and dashboard layout shell.

Both applications are intentionally stripped from database configuration, external
connectors, and feature‑specific controllers. Replace the placeholder logic with
your own services when integrating into a real system.

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
