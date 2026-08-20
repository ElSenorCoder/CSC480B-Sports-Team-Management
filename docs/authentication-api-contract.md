# Week 1 Authentication API Contract

## Purpose

This document defines the initial authentication API contract for Sprint 1, Week 1 of the Sports Team Management application.

The Week 1 authentication goal is to support the basic end-to-end login flow:
1. A user enters login credentials in the React frontend.
2. The frontend submits the credentials to the Express backend.
3. The backend validates the credentials against user data stored in the SQL database.
4. Valid credentials result in a successful response containing a JWT.
5. The JWT can be used to access a basic protected endpoint/page.
6. Invalid credentials result in an appropriate authentication error.

Full role-based authorization (RBAC) is outside the scope of this initial Week 1 API contract and will be refined in Week 2.

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
  "email": "user@example.com",
  "password": "examplePassword"
}
```

### Required Fields

| Field      | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `email`    | string | Yes      | Email address associated with the user's account |
| `password` | string | Yes      | Password submitted for authentication            |

## Successful Authentication

### HTTP Status

```text
200 OK
```

### Example Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<JWT>",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Expected Behavior

When valid credentials are submitted:

1. The backend locates the user in the SQL database.
2. The submitted credentials are validated.
3. The backend generates a JWT.
4. The JWT is returned to the frontend.
5. The frontend can use the token to access the basic protected route/page.

## Invalid Credentials

### HTTP Status

```text
401 Unauthorized
```

### Example Response

```json
{
  "success": false,
  "message": "Invalid email or password"
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
  "success": false,
  "message": "Email and password are required"
}
```

This response applies when required login information is missing from the request.

## Protected Endpoint

The Week 1 application requires a basic protected endpoint so the team can demonstrate that the JWT returned during authentication is usable.

**Method:**

```text
GET
```

**Endpoint:**

```text
/api/auth/protected
```

### Authorization Header

The frontend sends the JWT using the HTTP Authorization header:

```text
Authorization: Bearer <JWT>
```

### Successful Response

**HTTP Status:**

```text
200 OK
```

Example:

```json
{
  "success": true,
  "message": "Protected content accessed successfully"
}
```

## Missing or Invalid JWT

### HTTP Status

```text
401 Unauthorized
```

Example:

```json
{
  "success": false,
  "message": "Authentication required"
}
```

## Week 1 Scope

The initial API contract supports:

* Credential submission
* Valid credential handling
* Invalid credential handling
* Missing credential handling
* JWT generation and return
* JWT submission through the Authorization header
* Basic JWT verification
* Access to a basic protected endpoint

The following functionality is deferred or will be expanded in Week 2:

* Complete role-based access control (RBAC)
* Detailed role-specific authorization rules
* Complete logout/session behavior
* Additional protected application features

## Frontend/Backend Integration Summary

The expected Week 1 authentication flow is:

```text
React Login Form
       |
       v
POST /api/auth/login
       |
       v
Express Authentication Endpoint
       |
       v
SQL User Lookup / Credential Validation
       |
       +---- Invalid ----> 401 Authentication Error
       |
      Valid
       |
       v
JWT Generated
       |
       v
200 Response + JWT
       |
       v
React Frontend
       |
       v
Authorization: Bearer <JWT>
       |
       v
Protected Endpoint
       |
       v
Basic Protected/Dashboard Page
```

## Sprint 1 Notes

This is the initial Week 1 contract. The development team may refine implementation details as Sprint 1 progresses, and frontend and backend changes that alter the request/response structure will be communicated to the team and reflected in this document.
