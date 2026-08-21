# Initial Data Model

This folder contains the initial Sprint 1 data model for the Sports Team Management application.

The model defines the initial structure and relationships among:

- User
- Role
- Player
- Coach
- Team

## Current Scope Decisions

The currently planned user roles are:

- Administrator
- Coach
- Player
- Parent

The current application scope supports one Team.

Player and Coach profiles may reference the Team record. Parent is currently represented as a user role; a separate Parent profile entity has not been defined in the initial Sprint 1 model.

The editable model was created using MySQL Workbench. A PNG version of the EER diagram is also included for easier review.
