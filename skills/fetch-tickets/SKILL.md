---
name: fetch-tickets
description: "Retrieves tickets from external sources Jira and initializes them into the Spectral workspace as local folders and entries in the tasks.json registry."
---

# Fetch Tickets

Retrieve tickets from external sources and normalize them into the Spectral workspace structure.

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

## Target Structure

- **Configuration**: `.spectral/config.json`
- **Ticket Folder**: `.spectral/tasks/{TICKET_ID}/`
- **Ticket File**: `.spectral/tasks/{TICKET_ID}/ticket.md`
- **Registry**: `.spectral/registry/tasks.json`

## Steps

### 1. Fetch Tickets
- Utilize available integrations to retrieve tickets from Jira.
- Extract: `id`, `title`, `description`, `acceptance criteria`, `priority`, and `url`.

### 1.1 Extract Ticket Keywords
- For each Jira ticket, extract keywords from `title` + `description`.
- Keep keywords concise and execution-relevant (feature names, user-visible behavior, subsystem terms).

### 1.2 Map Ticket to Code Index
- Load `.spectral/code_index.json` and map ticket keywords against:
  - `featureTags`
  - file `summary`
  - file `responsibility`
- Build deterministic file candidates:
  - Primary files from feature matches
  - Secondary files from `dependsOn`
- Optimization: if ticket matches a feature exactly, load only that feature's files.

### 2. Check for Duplicates
- Open `.spectral/registry/tasks.json`.
- If the `id` already exists, **SKIP** that ticket.

### 3. Create Folder structure
- For each new ticket, create `.spectral/tasks/{TICKET_ID}/`.

### 4. Generate `ticket.md`
- Create `.spectral/tasks/{TICKET_ID}/ticket.md` using the template:

# {TICKET_ID}-{TITLE}

## Status
PENDING

## Source
Jira

## Priority
{PRIORITY}

## Created At
{CURRENT_TIMESTAMP}

---

## Description
{CLEANED_DESCRIPTION}

---

## Acceptance Criteria
{BULLET_POINTS_OF_AC}

---

## Notes
* 

---

## Links
* {URL}

### 5. Update Registry
- Append to `.spectral/registry/tasks.json`:
```json
{
  "id": "{TICKET_ID}",
  "title": "{TITLE}",
  "status": "PENDING",
  "priority": "{PRIORITY}",
  "keywords": ["{KEYWORD_1}", "{KEYWORD_2}"],
  "primaryFiles": ["{PRIMARY_FILE_PATH}"],
  "secondaryFiles": ["{DEPENDENCY_FILE_PATH}"]
}
```

## Strict Rules
- **Pure Intake**: Do NOT brainstorm, plan, or write code.
- **Data Integrity**: Do NOT overwrite existing folders or modify existing registry entries.
- **No Inference**: Do NOT add assumptions or "clarifications" to the description.
- **Normalization**: Clean and normalize description text; convert ACs to bullet points.
- **Index-First Jira Resolution**: All Jira tasks must be resolved using index-first strategy.
- **No Global Search**: Do NOT search the entire repository or scan directories for Jira task file discovery.
