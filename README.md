# Sports Team Management

Sprint 1 React application for login and protected dashboard access.

## Requirements

- Node.js 22 or newer
- The Express server running locally for login requests

## Setup

Open this folder in Visual Studio Code, then run:

```bash
npm install
```

Copy `.env.example` to `.env`. Update the URL if the Express server uses a
different port:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Start the application:

```bash
npm run dev
```

Vite will open `http://localhost:5173`.

## Login request

The form sends the following request to the Express server:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "coach@team.com",
  "password": "user-entered-password"
}
```

Expected response:

```json
{
  "token": "signed-jwt",
  "expiresIn": 3600,
  "user": {
    "id": "42",
    "name": "Jordan Coach",
    "email": "coach@team.com",
    "role": "coach"
  }
}
```

The token is stored in `sessionStorage`. The dashboard route checks for the
token and sends unauthenticated users back to the login page.

## Commands

```bash
npm run dev       # Start the development server
npm test          # Run the authentication tests
npm run build     # Type-check and create the production build
npm run preview   # Preview the production build
```

## Main folders

```text
src/components/   Shared React components
src/lib/          API, authentication, and configuration code
src/pages/        Login and dashboard pages
src/test/         Authentication tests
design/penpot/    Login design boards and tokens
docs/             Design, Express, and MySQL handoff notes
database/         MySQL Workbench script
```

## Team handoff files

- `docs/DESIGN_HANDOFF.md`
- `docs/BACKEND_INTEGRATION.md`
- `docs/DATABASE_INTEGRATION.md`
- `database/mysql-sprint1-auth.sql`
