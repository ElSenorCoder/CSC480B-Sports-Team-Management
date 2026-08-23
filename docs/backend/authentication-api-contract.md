# Sprint 1 Authentication API Contract

## Purpose

This document defines the current Sprint 1 authentication API contract for the Sports Team Management application.

The current login flow uses a server-generated session token rather than a JWT.

The authentication flow is:

1. A user enters a username or email and password in the React frontend.
2. The frontend sends the credentials to the Express backend.
3. The backend validates the credentials against the `users` table.
4. The backend creates a session token.
5. The session token is stored in the `sessions` table.
6. The backend sets the session token in an HttpOnly cookie and also returns the token in the response body.

The currently planned application roles are Administrator, Coach, Player, and Parent. Detailed role-specific authorization rules remain outside the current authentication contract.

## Base API Path

```text
/api/auth
```

## Login Endpoint

### Request

**Method:** `POST`

**Endpoint:**

```text
/api/auth/login
```

**Content-Type:**

```text
application/json
```

### Request Body

```json
{
  "identifier": "coach_smith",
  "password": "user-entered-password"
}
```

### Required Fields

| Field        | Type   | Required | Description                              |
| ------------ | ------ | -------- | ---------------------------------------- |
| `identifier` | string | Yes      | Username or email associated with the account |
| `password`   | string | Yes      | Password submitted for authentication   |

The `identifier` may contain either the user's username or email address.

## Successful Authentication

### HTTP Status

```text
200 OK
```

### Example Response

```json
{
  "user": {
    "id": 1,
    "username": "coach_smith",
    "first_name": "John",
    "last_name": "Smith",
    "email": "jsmith@sportsteam.org",
    "phone": "555-0102"
  },
  "token": "<session-token>"
}
```

### Expected Behavior

When valid credentials are submitted:

1. The backend searches for an active user matching the username or email.
2. The submitted password is validated against the stored password hash.
3. The backend generates a session token.
4. The session is stored in the `sessions` table with an expiration time.
5. The backend sets a `sessionToken` HttpOnly cookie.
6. The backend returns the authenticated user and session token.

The current session expiration period is one hour.

## Invalid Credentials

### HTTP Status

```text
401 Unauthorized
```

### Example Response

```json
{
  "error": "Invalid username or password"
}
```

The same general authentication error should be returned for an incorrect password or an account that cannot be authenticated. The response should not expose sensitive credential information.

## Missing Credentials

### HTTP Status

```text
400 Bad Request
```

### Example Response

```json
{
  "error": "Username and password are required"
}

This response applies when required login information is missing from the request.

## Session Handling

The current backend stores authentication sessions in the database.

Each session contains:

- Session token
- User ID
- Expiration time
- Created time

The session token is also sent as an HttpOnly cookie named:

`sessionToken`

For local development, the cookie is configured with:

- `httpOnly: true`
- `secure: false`
- `sameSite: lax`
- `maxAge: 1 hour`

## Week 1 Scope

The current authentication implementation supports:

- Login using username or email
- Password validation
- Active-user validation
- Session-token generation
- Session persistence in the database
- HttpOnly session cookie creation
- Successful and failed authentication responses

The following functionality is not currently defined by this contract:

- A dedicated protected authentication endpoint
- Logout/session invalidation endpoint
- Full role-based authorization rules
- Role-specific protected routes

## Frontend/Backend Integration Summary

The expected Week 1 authentication flow is:

```text
React Login Form
       |
       v
POST /api/auth/login
       |
       v
Express Authentication Route
       |
       v
User Lookup by Username or Email
       |
       +---- Invalid ----> 401 Authentication Error
       |
      Valid
       |
       v
Session Token Generated
       |
       v
Session Stored in Database
       |
       v
HttpOnly Cookie + 200 Response
       |
       v
React Frontend
```

## Sprint 1 Notes

This contract reflects the current authentication implementation in the repository. If the frontend or backend changes the request format, response format, session handling, or authorization behavior, this document should be updated accordingly.