# Backend Integration Guide — Sprint 1 Authentication

## Purpose

This document defines what the React application expects from the Node.js/Express
authentication service. The backend remains a separate project and owns
credential verification, JWT creation, authorization, and database access.

## React application configuration

The browser application reads the server base URL from:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

After changing `.env`, restart the Vite development server. Never place the JWT
secret, database credentials, or other server secrets in a `VITE_` variable;
those values are compiled into browser code.

## Login endpoint contract

### Request

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "coach@example.com",
  "password": "user-entered-password"
}
```

`identifier` may contain a username or email address. The backend should trim
surrounding whitespace and determine which user field to query. The browser
does not hash the password; it sends credentials over HTTPS and the backend
performs secure password verification.

### Successful response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "token": "signed-jwt",
  "expiresIn": 3600,
  "user": {
    "id": "42",
    "name": "Jordan Coach",
    "email": "coach@example.com",
    "role": "coach"
  }
}
```

Supported Sprint 1 role strings are `administrator`, `coach`, and `player`.
Keep these lowercase so the response matches `src/types/auth.ts`.

### Error response

Use one consistent JSON shape:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The username or password is incorrect."
  }
}
```

| Status | Code | When to use |
| ---: | --- | --- |
| 400 | `VALIDATION_ERROR` | Identifier or password is missing or malformed |
| 401 | `INVALID_CREDENTIALS` | Account does not exist or password is wrong |
| 403 | `ACCOUNT_DISABLED` | Known account is not permitted to sign in |
| 429 | `TOO_MANY_ATTEMPTS` | Login rate limit was exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |

Return the same `INVALID_CREDENTIALS` response for nonexistent accounts and
wrong passwords so the endpoint does not reveal whether an account exists.

## JWT expectations

Minimum recommended claims:

```json
{
  "sub": "42",
  "role": "coach",
  "iat": 1787356800,
  "exp": 1787360400,
  "iss": "sports-team-api",
  "aud": "sports-team-client"
}
```

- Sign tokens only on the server with a secret/private key stored in server
  environment configuration.
- Use a short expiration for access tokens.
- Never place password hashes or sensitive player information in the token.
- Verify signature, issuer, audience, expiration, and authorization on every
  protected backend route.

For the Week 1 demonstration, the React application stores the access token in
`sessionStorage`. Protected browser routing checks for that token, and
`src/lib/api/apiClient.ts` attaches it as:

```http
Authorization: Bearer signed-jwt
```

The browser route guard is only a user-experience control. It does not replace
backend authorization.

## CORS for local development

Allow the React development origin, normally `http://localhost:5173`, and
the deployed application origin used by the team. Recommended behavior:

- allow `POST`, `GET`, `OPTIONS` as needed;
- allow `Content-Type` and `Authorization` headers;
- do not use `Access-Control-Allow-Origin: *` with credentialed requests;
- keep the allowed-origin list in backend environment configuration.

## Express implementation sequence

1. Parse JSON request bodies.
2. Validate `identifier` and `password`.
3. Look up the active user by normalized username or email.
4. Compare the submitted password with the stored password hash.
5. Load the user's role.
6. Sign the JWT with the agreed claims and expiration.
7. Return the exact success response above.
8. Add authentication middleware that verifies Bearer tokens on protected
   routes.
9. Add rate limiting and server-side audit logging without logging passwords or
   raw tokens.

## Backend acceptance checklist

- [ ] Valid credentials return 200, token, expiration, and user object.
- [ ] Wrong password and nonexistent account both return 401.
- [ ] Missing credentials return 400.
- [ ] Disabled accounts return 403.
- [ ] Protected route rejects missing, invalid, or expired tokens.
- [ ] Protected route accepts a valid token and exposes the verified user ID.
- [ ] CORS permits the configured application origin.
- [ ] Passwords and tokens never appear in application logs.
