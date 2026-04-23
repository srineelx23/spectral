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

After task intake (registry-backed or freeform), run execution with index-driven flow:

Jira execution policy: All Jira tasks must be resolved using index-first strategy.

0. **Load `code_index.json`**
   - Load and validate `.spectral/code_index.json` before any file discovery action.

1. **Task to Feature Mapping**
   - Extract task keywords (for example: `dark mode`, `landing page`).
   - Match keywords against index fields:
     - `featureTags`
     - file `summary`
     - file `responsibility`
   - For Jira tickets, keywords must come from ticket `title` + `description`.

2. **File Selection (No Search)**
   - Select the minimum file set directly from index metadata.
   - Use `features` to map feature to files.
   - Use `files` metadata (`responsibility`, `summary`) to confirm exact targets.
   - Build file set deterministically:
     - Primary files from feature matches
     - Secondary files from `dependsOn`
   - Optimization: if ticket matches a feature exactly, load only that feature's files.

3. **Read Selected Files Once**
   - Read only the selected files.
   - Do not re-read files already loaded in the current execution.

4. **Batch Edit All Files**
   - Apply all planned edits in one batch per implementation slice.

5. **Run Test/Build Once**
   - Run verification once after batched edits.
   - Summarize outcomes and persist lifecycle artifacts (`specPath`, `planPath`) as needed.

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
- Never scan the entire `src` directory.
- Never re-read files already loaded for the current execution.
- Never call search tools if `code_index.json` has relevant entries.
- Maximum file reads per execution: 8.
- Never search the entire repository for Jira execution.
- Never scan directories for Jira execution when index entries are available.
