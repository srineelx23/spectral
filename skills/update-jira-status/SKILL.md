---
name: update-jira-status
description: Updates the status of a Jira ticket on the remote board to synchronize with local progress.
---

# Update Jira Status

Use this skill to keep the remote Jira board in sync with the local Spectral workspace status.

## Steps

### 1. Identify Ticket and Context
- Retrieve the Jira `id` (e.g., `ABC-123`) from the local task registry or `ticket.md`.
- Ensure the Jira `cloudId` is available from the configuration or environment.

### 2. Map Status
- Map the local status to the corresponding Jira transition:
  - `IN_PROGRESS` -> `In Progress` / `Ongoing`
  - `DONE` -> `Done` / `Resolved`
  - `BLOCKED` -> `To Do` / `Blocked` (or add a comment if no specific status exists)
- If the exact status name is unclear, fetch the available transitions for the ticket via the Jira API first.

### 3. Execute Transition
- Perform the Jira transition using the identified status/transition ID.
- Optionally add a brief comment: "Status updated via Spectral workspace."

## Strict Rules
- **Cloud ID Only**: Only interact with Jira using the verified `cloudId`.
- **Targeted Update**: Do NOT modify ticket fields (description, title, etc.) unless explicitly instructed. Only update the status/transition.
- **Automated Workflow**: Treat this skill as an automated background sync step. Do not ask for user confirmation for the status change itself if the integration is correctly configured.
- **Error Handling**: If the transition fails (e.g., due to workflow constraints), inform the user and do NOT force a local status change if synchronization is required.
