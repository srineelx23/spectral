---
name: execute-task
description: Use when a task is captured in tasks.json, imported from Jira, or supplied as a freeform user prompt and you want to run the full implementation lifecycle from planning through verified completion
---

# Execute Task

Run a task-centered workflow from a registry entry or user-provided prompt: select or capture the work item, gather missing context, create a plan, execute it, and verify results.

## Code Index Usage Rule

## INDEX-FIRST EXECUTION POLICY

- code_index.json is the primary source of truth
- repository search is a last resort
- file discovery MUST happen through index
- repeated file reads are prohibited
- task execution must minimize context size

If index is available, ignoring it is considered a failure.

This rule is mandatory and applies before any file search or repository scan.

1. Load and consult `.spectral/code_index.json` first.
2. Prefer `features` to identify feature-related files.
3. Use `files` metadata to locate exact file paths.
4. Expand only with `dependsOn` and `usedBy` when needed.
5. Do not use glob or grep if the code index already contains relevant entries.
6. Start with matching `featureTags` for the task, then expand through the dependency graph only if needed.
7. Maximum files to read must come from the index, not from search.
8. If the index is missing or outdated, allow limited search only, capped at 3 files.

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
   - **Jira Sync**: If the task originated from Jira, use `spectral:update-jira-status` to update the remote board to `IN_PROGRESS` or `Ongoing`.
   - Record `startedAt` timestamp if absent.
   - For freeform prompts, store the prompt text in the active session or task context that drives brainstorming and planning.

4. **Run Brainstorming**
   - **REQUIRED SUB-SKILL:** Use `spectral:brainstorming`.
   - Provide selected task details and user constraints.
   - Ensure user approves the written spec before planning.

5. **Write Implementation Plan**
   - **REQUIRED SUB-SKILL:** Use `spectral:writing-plans`.
   - Keep plan focused only on the selected task scope.

6. **Execute Plan (Index-First Flow)**
   - All Jira tasks and index-backed tasks must be resolved using the index-first strategy.
   - **Execution Process**:
     1. **Load `code_index.json`**: Load and validate `.spectral/code_index.json` before any file discovery action.
     2. **Task to Feature Mapping**: Extract keywords (title/description for Jira) and match against `featureTags`, `summary`, and `responsibility` in the index.
     3. **File Selection**: Select the minimum file set directly from index metadata (Primary files from feature matches, Secondary from `dependsOn`).
     4. **Execution Mode**: Ask execution mode:
        1. `spectral:subagent-driven-development` (recommended)
        2. `spectral:executing-plans`
     5. **Read Once & Batch Edit**: Read selected files once; apply all planned edits in one batch per implementation slice.
     6. **Verify Once**: Run verification (test/build) once after batched edits.

7. **Verify Completion**
   - Confirm required tests/checks pass.
   - Confirm user-imposed constraints were followed.
   - Summarize results and remaining risks.

8. **Persist Outcome**
   - If complete: set registry task `status` to `DONE`, add `completedAt`.
   - If blocked: set registry task `status` to `BLOCKED`, add `blocker` notes.
   - **Jira Sync**: If the task originated from Jira, use `spectral:update-jira-status` to update the remote board to `DONE` or `BLOCKED` (as appropriate).
   - For freeform prompts, persist the outcome in the session/task artifacts used by the lifecycle.
   - Save artifact references when available (`specPath`, `planPath`).

Optimization:
"If index provides sufficient context, skip reading files and directly edit using structural hints (functions, responsibilities)."

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
- **Automated Jira Sync**: Perform Jira status updates as a standard part of the task lifecycle without requiring additional explicit user prompts for each transition.
- Never scan the entire `src` directory.
- Never re-read files already loaded for the current execution.
- Never call search tools if `code_index.json` has relevant entries.
- Maximum file reads per execution: 8.
- Never search the entire repository for Jira execution.
- Never scan directories for Jira execution when index entries are available.
