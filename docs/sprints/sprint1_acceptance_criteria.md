# Sprint 1 Acceptance Criteria and Definition of Done

## Sprint 1 Goal

Sprint 1 is focused on completing the **basic end-to-end authentication flow** between the React frontend, Express backend, and SQL database.

A seeded user must be able to submit valid credentials, have those credentials validated by the backend against stored user data, establish an authenticated session, and access a basic protected page.

The Sprint 1 requirements reference JWT return as part of the intended authentication flow. However, the current authentication implementation uses a server-generated session token backed by the database and an HttpOnly cookie rather than a JWT. The acceptance criteria below therefore focus on the required authentication behavior while recognizing the current implementation.

Full role-based access control (RBAC), detailed permission enforcement, and role-specific protected pages are **not required for Sprint 1 completion**.

## Acceptance Criteria

- [ ] **Valid credentials are accepted.**  
  A registered/seeded user can submit a username or email and password through the login form. The backend looks up the user and validates the submitted password against the stored password hash.

- [ ] **Successful authentication establishes an authenticated session.**  
  When valid credentials are submitted to `POST /api/auth/login`, the backend returns a successful response and creates the authentication state required by the current application.

- [ ] **Authentication token/session information is returned or established successfully.**  
  The Sprint 1 requirement identifies JWT return as the intended authentication mechanism. The current implementation instead creates a server-generated session token, stores the session in the database, and establishes the session through the application's current authentication mechanism. Migration to JWT is not required solely to demonstrate the basic end-to-end Sprint 1 login flow unless the team explicitly decides to replace the current session-token implementation.

- [ ] **The frontend recognizes successful authentication.**  
  After successful login, the frontend recognizes the authenticated state and allows the user to proceed to the application's basic protected page.

- [ ] **Authenticated users can access the protected page.**  
  A successfully authenticated user can access the basic protected page without being redirected back to the login page.

- [ ] **Unauthenticated users cannot access the protected page.**  
  Attempting to access the protected page without a valid authenticated session redirects the user to the login page or otherwise denies access.

- [ ] **Incorrect passwords are rejected.**  
  A login attempt using an incorrect password does not create an authenticated session and returns an appropriate authentication failure response.

- [ ] **Unknown users are rejected.**  
  A login attempt using a username or email that does not correspond to an existing user does not create an authenticated session.

- [ ] **Invalid credentials receive an appropriate response.**  
  Invalid credentials result in an appropriate authentication error, such as `401 Unauthorized`, and the frontend displays a login error rather than granting access to the protected page.

- [ ] **Missing required credentials are handled appropriately.**  
  Requests missing required login credentials are rejected appropriately, such as with `400 Bad Request`, and do not create an authenticated session.

- [ ] **The complete login flow works end to end.**  
  The React frontend, Express authentication endpoint, SQL user lookup, password validation, authentication/session creation, frontend authentication handling, and protected page work together using the project's normal local development configuration.

- [ ] **Authentication behavior is tested.**  
  Automated and/or documented manual testing covers, at minimum:
  - successful login with valid credentials;
  - successful creation or establishment of authentication state;
  - access to the protected page after authentication;
  - rejection of an incorrect password;
  - rejection of an unknown/unregistered user;
  - handling of missing required credentials; and
  - prevention of unauthenticated access to the protected page.

## Initial Definition of Done

A Sprint 1 authentication task is considered **Done** when:

- [ ] The implementation is committed to the repository and integrated with the current Sprint 1 codebase.
- [ ] The React login page communicates successfully with the Express authentication API.
- [ ] Login credentials are validated against application/database user data rather than relying only on frontend validation.
- [ ] Password validation is performed securely against the stored password hash.
- [ ] Successful authentication creates the authentication/session state required by the current application.
- [ ] The frontend correctly recognizes successful authentication.
- [ ] The basic protected page is accessible after successful authentication.
- [ ] Direct access to the protected page without valid authentication is denied or redirected to login.
- [ ] Invalid credentials do not create an authenticated session.
- [ ] Authentication failures are handled without exposing sensitive credential information.
- [ ] Relevant automated tests pass.
- [ ] The project successfully builds using the project's documented build process.
- [ ] The documented manual Sprint 1 login test cases have been executed and any blocking authentication defects have been resolved or documented.
- [ ] Authentication documentation reflects the implemented authentication mechanism.
- [ ] No passwords, authentication secrets, session tokens, or other sensitive configuration values are committed to source control.
- [ ] Code is ready for team review and does not introduce known regressions to the basic Sprint 1 login flow.

## Out of Scope for Sprint 1 Definition of Done

The following items are **not required for Sprint 1 acceptance**:

- Complete role-based access control (RBAC).
- Per-role authorization rules or permission matrices.
- Fully implemented role-specific dashboards.
- Fine-grained authorization of application features.
- Production-grade token refresh or revocation.
- Advanced session lifecycle management beyond what is required for the basic authentication flow.
- Production deployment hardening.

These items can be expanded in later sprints without preventing the basic Sprint 1 authentication flow from being considered complete.

## Authentication Implementation Note

The Sprint 1 requirement references JWT return as part of the desired login flow. The current repository authentication contract documents a server-generated session-token implementation instead of JWT authentication.

For Sprint 1, acceptance should be based primarily on the required end-to-end authentication behavior: credentials are validated, successful authentication establishes an authenticated session, authenticated users can access the protected page, invalid credentials are rejected appropriately, and the required tests pass.