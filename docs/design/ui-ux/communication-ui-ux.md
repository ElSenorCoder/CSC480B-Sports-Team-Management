# Communication UI/UX Design

## Purpose

This document defines the initial UI/UX design for a future team messages and announcements feature.

The goal is to keep the first version small and consistent with the current team, roster, and scheduling interfaces.

## Proposed Location

The communication feature should be available from an individual team's workspace.

Suggested route:

`/team/:id/messages`

A **Messages** or **Announcements** link can be placed with the existing team actions near the current **View schedule** action.

## Page Header

The page should follow the existing dashboard layout and visual patterns.

Suggested content:

- Eyebrow: `Team`
- Title: `{Team Name} messages`
- Description: `View team announcements and updates.`
- Optional badge showing the number of messages
- Navigation back to the team's main roster/detail page

## Message List

Messages should appear in a simple chronological list.

Each message should display:

- Sender name
- Sender role
- Message content
- Date
- Time

Example:

**Jordan Coach · Head Coach**

Practice has been moved to Field 2.

Sep 8, 2026 · 5:30 PM

The message list should reuse the application's existing card or panel styling so the communication feature remains visually consistent with the rest of the application.

## Compose Area

A basic compose area should be available only to users who are authorized to post team announcements.

Initial suggested access:

- Head Coach — can compose
- Assistant Coach — can compose
- Player — read-only

Final authorization should follow the backend role and permission implementation.

Suggested compose controls:

- Message textarea
- `Post announcement` button

Unauthorized users should still be able to read messages, but the compose area should be hidden or disabled.

## Initial Scope

The first version should support:

- Team message or announcement list
- Sender information
- Message content
- Date and time
- Basic compose area for authorized users

The first version does not require:

- Direct or private messaging
- Message threads
- Reactions
- Attachments
- Read receipts
- Complex notification settings

## UX States

### Empty State

`No team announcements yet.`

### Loading State

Use the application's existing loading or `empty-note` pattern.

### Error State

Use the application's existing `form-error` pattern.

## Multi-Team Behavior

Messages should remain team-specific.

Users who belong to multiple teams should only see the communication history for the team they currently selected.

## Status

Initial communication UI/UX design for Sprint 4.
