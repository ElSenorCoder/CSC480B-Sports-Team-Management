# Initial Data Model

This folder contains the initial Sprint 1 data model for the Sports Team Management application.

The current Sprint 1 database model defines the following entities:

- Role
- User
- Session

## Current Scope Decisions

The currently defined user roles are:

- Administrator
- Coach
- Player
- Parent

Parent is currently represented as a user role rather than a separate profile entity.

Player, Coach, and Team remain part of the broader application scope, but separate database tables for those entities are not included in the current developer-provided Sprint 1 SQL schema.

## User Entity

The User entity currently includes:

- User ID
- Username
- Role ID
- First name
- Last name
- Email
- Phone
- Password hash
- Active status
- Created timestamp
- Updated timestamp

The `is_active` field indicates whether the user account is currently active.

## Role Entity

The Role entity currently includes:

- Role ID
- Name
- Description

Each User references one Role.

## Session Entity

The Session entity currently includes:

- Session ID
- Session token
- User ID
- Expiration timestamp
- Created timestamp

Each Session references one User.

The editable model was created using MySQL Workbench. A PNG version of the EER diagram is also included for easier review.