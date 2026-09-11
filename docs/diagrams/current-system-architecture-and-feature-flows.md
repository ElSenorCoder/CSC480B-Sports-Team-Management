# Current System Architecture and Feature Flows

## Purpose

This document describes the current implemented architecture and major user flows of the Sports Team Management Platform based on the functionality available and verified during Sprint 4 - Week 4.

It provides a current reference for how the frontend, backend, and database work together and how the main Player and Coach workflows move through the application.

Because development is still ongoing during the sprint, this document reflects the system as it exists at the time it was created. It should not be treated as a final description of all Sprint 4 functionality.

The document will be reviewed and updated near the end of the current sprint or at the beginning of the next sprint, depending on when remaining frontend, backend, and database changes are implemented and verified.

---

## High-Level System Architecture

The Sports Team Management Platform currently follows a three-layer web application architecture.

### Frontend

- React
- TypeScript
- React Router
- Provides the user interface for Players and Coaches.

### Backend

- Node.js
- Express
- Handles authentication, user information, team management, roster management, join requests, and scheduling operations.

### Database

- MySQL
- Stores application data including users, roles, sessions, teams, memberships, join requests, games, and related project data.

### Basic Architecture Flow

```text
Player / Coach
      |
      v
React Frontend
      |
      | HTTP / API Requests
      v
Node.js / Express Backend
      |
      | SQL Queries
      v
MySQL Database
      |
      v
Backend Response
      |
      v
React Frontend
      |
      v
Player / Coach
```

---

## Authentication and Session Flow

The current application uses session-based authentication.

```text
User
 |
 v
Login Page
 |
 v
Frontend sends login request
 |
 v
Authentication Backend Route
 |
 v
Credentials are validated
 |
 v
Session is created
 |
 v
Authenticated user enters the application
 |
 v
Dashboard / Protected Pages
```

Protected application areas include the Dashboard, Profile, My Teams, Team Details, Team Schedule, Find a Team, Coach Roster, and Coach Schedule.

Unauthenticated users are redirected back to the login page.

---

## Current Frontend Structure

### Shared User Pages

| Page | Purpose |
|---|---|
| Login | Allows a user to authenticate |
| Dashboard | Main landing area after login |
| Profile | Displays the current user's profile |
| My Teams | Displays teams the user belongs to |
| Team Detail | Displays information and roster for a selected team |
| Team Schedule | Displays schedule information for a selected team |
| Find a Team | Allows users to search for teams |

### Coach Pages

| Page | Purpose |
|---|---|
| Coach Roster | Allows a Coach to review roster information and join requests |
| Coach Schedule | Allows a Coach to view and manage supported schedule information |

---

## Player Feature Flow

### Main Player Flow

```text
Player Login
 |
 v
Dashboard
 |
 +----------------------+
 |                      |
 v                      v
Profile               My Teams
                        |
                        v
                   Select Team
                        |
                  +-----+------+
                  |            |
                  v            v
               Roster       Schedule
```

### Team Search and Join Request Flow

```text
Player
 |
 v
Find a Team
 |
 v
Search Teams
 |
 v
Select Team
 |
 v
Send Join Request
 |
 v
Wait for Coach Decision
```

A Player can currently:

- Log in to the application.
- View their profile.
- View teams they belong to.
- Select a team.
- View a team roster.
- View a team schedule.
- Search for additional teams.
- Submit a request to join a team.

---

## Coach Feature Flow

### Roster and Join Request Flow

```text
Coach Login
 |
 v
Dashboard
 |
 +-----------------------+
 |                       |
 v                       v
Profile              Coach Roster
                         |
                         v
                  Pending Join Requests
                         |
                  +------+------+
                  |             |
                  v             v
               Approve        Reject
                  |
                  v
             Player Added
              to Roster
```

### Scheduling Flow

```text
Coach
 |
 v
Coach Schedule
 |
 v
View Team Schedule
 |
 v
Manage Supported Schedule Information
```

A Coach can currently:

- Log in to the application.
- View their profile.
- Access team and roster information.
- Review pending Player join requests.
- Approve or reject join requests.
- View team scheduling information.
- Use currently supported schedule-management functionality.

---

## Current Backend Structure

The backend separates application responsibilities into route modules.

| Backend Area | Responsibility |
|---|---|
| Authentication Routes | Login, logout, authentication, and session-related operations |
| User Routes | Current-user information and profile-related operations |
| Team Routes | Team information, memberships, team search, roster, and team-related operations |
| Coach Routes | Coach-specific roster, join-request, and scheduling operations |

Current backend route files include:

```text
server/routes/auth.js
server/routes/user.js
server/routes/team.js
server/routes/coach.js
```

The backend serves as the connection between the React frontend and the MySQL database.

---

## Current Database Responsibilities

The MySQL database provides persistent storage for the application.

Current database areas include information related to:

- Users
- Roles
- Sessions
- Teams
- Team memberships
- Join requests
- Games and scheduling
- Messages and announcements
- Supporting relationships and database views

Database features currently being developed or extended during Week 4 should only be marked complete after they have been integrated and verified.

---

## End-to-End Example: Player Joins a Team

```text
Player opens Find a Team
        |
        v
Frontend requests team information
        |
        v
Express backend processes request
        |
        v
MySQL returns team information
        |
        v
Player sends join request
        |
        v
Backend stores join request
        |
        v
Coach opens Coach Roster
        |
        v
Backend retrieves pending requests
        |
        v
Coach approves or rejects request
        |
        v
Database is updated
        |
        v
Updated roster is displayed
```

This flow demonstrates how the frontend, backend, and database work together for a complete application workflow.

---

## End-to-End Example: Team Schedule

```text
User selects team
 |
 v
Team Schedule Page
 |
 v
Frontend requests schedule
 |
 v
Backend receives request
 |
 v
Database retrieves game information
 |
 v
Backend returns schedule data
 |
 v
Frontend displays schedule
```

Coach schedule-management actions follow the same frontend-to-backend-to-database pattern.

---

## Messages and Announcements

**Current Status: Week 4 Development / Integration**

The project is establishing support for team messages and announcements.

The planned application flow follows the existing architecture:

```text
Coach
 |
 v
Messages / Announcement Interface
 |
 v
Backend Message Support
 |
 v
Messages Database Data
 |
 v
Player Views Team Message / Announcement
```

This section should be updated after the Week 4 messaging functionality has been integrated and verified.

---

## Current Architecture Status

The following statuses reflect functionality currently available or under development at the time this document was prepared.

Features that are completed later in the sprint should be updated during the end-of-sprint review or during the beginning of the following sprint if implementation or verification occurs after the current review.

| Area | Current Status |
|---|---|
| Authentication / Sessions | Implemented |
| User Profiles | Implemented |
| Multi-Team User Access | Implemented |
| Team Details | Implemented |
| Team Rosters | Implemented |
| Team Search | Implemented |
| Join Requests | Implemented |
| Coach Join-Request Management | Implemented |
| Team Scheduling | Implemented / Continuing Refinement |
| Messages / Announcements | Week 4 Development |
| Parent Support | Database Development / Future Application Integration |
| Seasons | Database Development / Future Application Integration |
| Attendance | Future Sprint |
| Performance Tracking | Future Sprint |
| Full Notifications | Future Sprint |
| Reporting | Future Sprint |

---

## Maintenance and Update Schedule

This document is intended to be a living architecture reference rather than a one-time final document.

It should be reviewed near the end of each sprint to determine whether frontend, backend, database, navigation, or user-flow changes need to be reflected.

If major features are implemented or verified after the end-of-sprint documentation review, the document should be updated at the beginning of the following sprint.

Feature statuses should only be changed to implemented after the related functionality has been integrated and verified by the team.

This approach keeps the architecture reference aligned with the actual state of the application as development continues.
