---
name: execute-task
description: Use when a task is captured in tasks.json, imported from Jira, or supplied as a freeform user prompt and you want to run the full implementation lifecycle from planning through verified completion
---

# Execute Task

Run a task-centered workflow from a registry entry or user-provided prompt: select or capture the work item, gather missing context, create a plan, execute it, and verify results.

**Announce at start:** "I'm using the execute-task skill to run the selected task lifecycle."

## Scope

- **Source of truth:** `tasks.json`, Jira-synced entries, or an explicit user prompt for ad hoc work
- **Task lifecycle:** brainstorm -> plan -> execute -> verify
- **Out of scope:** git branch management, merges, PRs, or any git control actions

## Task Intake Modes

Support both of these inputs before starting the lifecycle:

- **Registry-backed task**: load a task from `tasks.json` or Jira-synced workspace entries, then let the user choose one.
- **Freeform prompt**: if the user provides their own goal instead of a registry entry, capture that prompt as the active task and run the lifecycle on it.

If both are available, ask which source to use. If the registry is missing or empty, ask whether the user wants to enter a prompt instead of stopping immediately.

## Task Schema (minimum)

Each task entry should include:
- `id`
- `title`
- `status` (for example: `PENDING`, `IN_PROGRESS`, `DONE`, `BLOCKED`)

If task metadata is incomplete, ask targeted clarification questions before planning.

## The Process

1. **Load and Validate Tasks**
   - Open `tasks.json` when a registry-backed task source is available.
   - If the registry is missing, invalid, or empty, offer the freeform prompt path instead of stopping immediately.
   - Filter selectable tasks (default: `PENDING` and `BLOCKED`).

2. **Display and Select Task**
   - For registry-backed work, show a numbered list: `id`, `title`, `priority` (if present), `status`.
   - Ask user to select by number or id, or choose to enter a custom prompt.
   - For freeform work, capture the user's prompt as the active task and confirm the wording before proceeding.

3. **Set Active Status**
   - Mark selected registry task as `IN_PROGRESS` in `tasks.json`.
   - Record `startedAt` timestamp if absent.
   - For freeform prompts, store the prompt text in the active session or task context that drives brainstorming and planning.

4. **Run Brainstorming**
   - **REQUIRED SUB-SKILL:** Use `spectral:brainstorming`.
   - Provide selected task details and user constraints.
   - Ensure user approves the written spec before planning.

5. **Write Implementation Plan**
   - **REQUIRED SUB-SKILL:** Use `spectral:writing-plans`.
   - Keep plan focused only on the selected task scope.

6. **Execute Plan**
   - Ask execution mode:
     1. `spectral:subagent-driven-development` (recommended)
     2. `spectral:executing-plans`
   - Execute all plan steps and required verifications.

7. **Verify Completion**
   - Confirm required tests/checks pass.
   - Confirm user-imposed constraints were followed.
   - Summarize results and remaining risks.

8. **Persist Outcome**
   - If complete: set registry task `status` to `DONE`, add `completedAt`.
   - If blocked: set registry task `status` to `BLOCKED`, add `blocker` notes.
   - For freeform prompts, persist the outcome in the session/task artifacts used by the lifecycle.
   - Save artifact references when available (`specPath`, `planPath`).

## Failure Handling

Stop and ask for guidance when:
- Selected task lacks enough detail after clarifications
- A required verification fails repeatedly
- The plan conflicts with explicit user constraints

Only stop for registry parsing issues if the user did not provide a prompt alternative.

Do not guess through blockers.

## Hard Rules

- Never modify unrelated tasks while executing one task.
- Never infer hidden requirements; ask.
- Never perform git control actions (branch creation, merge, PR, cleanup) as part of this skill.
- Keep all lifecycle decisions and output scoped to the selected task.
- **Tech Stack Enforcement**: All development must adhere to `.spectral/memory/tech_stack.json`. No unauthorized frameworks or version conflicts.
