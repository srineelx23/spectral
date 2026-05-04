---
name: fetch-tickets
description: "Retrieves tickets from Jira via MCP and initializes them into the Spectral workspace as local folders and entries in the tasks.json registry."
---

# Fetch Tickets

Retrieve tickets from Jira and normalize them into the Spectral workspace structure.

## Code Index Usage Rule

## INDEX-FIRST EXECUTION POLICY

- code_index.txt is the primary source of truth
- repository search is a last resort
- file discovery MUST happen through index
- repeated file reads are prohibited
- task execution must minimize context size

If index is available, ignoring it is considered a failure.

This rule is mandatory and applies before any file search or repository scan.

1. Load and consult `.spectral/code_index.txt` first.
2. Prefer `features` to identify feature-related files.
3. Use `files` metadata to locate exact file paths.
4. Expand only with `dependsOn` and `usedBy` when needed.
5. Do not use glob or grep if the code index already contains relevant entries.
6. Start with matching `featureTags` for the task, then expand through the dependency graph only if needed.
7. Maximum files to read must come from the index, not from search.
8. If the index is missing or outdated, allow limited search only, capped at 3 files.

## Execution Mode
- **Autonomous Import**: Once the project key or JQL is provided, perform the full fetch and import lifecycle in a single, fluid pass.
- **Do NOT pause** to ask for confirmation before converting descriptions, extracting acceptance criteria, or updating the registry.
- **Full Extraction Policy**: You MUST extract all available ticket data (including full descriptions and acceptance criteria) and populate the `ticket.md` templates completely in the first pass. Never leave sections blank for later refinement if the data is available in Jira.
- **Silent Processing**: Only stop to report the final summary of imported tickets.

## Steps

### 1. Fetch Tickets
- Use the MCP tool `jira_search_issues` to fetch tickets from Jira.
- Authentication and Jira configuration are handled automatically via `mcp-config.json`.
- Do NOT prompt the user for API token, email, or domain.
- Use JQL query:
  project = {PROJECT_KEY} ORDER BY created DESC
- Maximum results: 50
- **Data Completeness**: Use `expand=renderedFields` in the request to get formatted descriptions.
- Extract: `id`, `summary` (as title), `renderedFields.description` (convert HTML to clean Markdown), `priority`, `url`, `status` (as `remoteStatus`).
- **Acceptance Criteria**: Search the description and custom fields for Acceptance Criteria; if found, extract them as bullet points.

### 1.1 Extract Ticket Keywords
- For each Jira ticket, extract keywords from `title` + `description`.
- Keep keywords concise and execution-relevant (feature names, user-visible behavior, subsystem terms).

### 1.2 Map Ticket to Code Index
- Load `.spectral/code_index.txt` and map ticket keywords against:
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
- For each new ticket, create `.spectral/tasks/{TICKET_ID}/` ensuring all parent directories are created recursively (e.g., `mkdir -p`).

### 4. Generate `ticket.md`
- **Template Usage**: Load and populate the template from `.spectral/templates/ticket-template.md`.
- Ensure all placeholders (`{TICKET_ID}`, `{TITLE}`, `{CLEANED_DESCRIPTION}`, etc.) are correctly replaced with Jira data.
- Save the result to `.spectral/tasks/{TICKET_ID}/ticket.md`.

### 5. Update Registry
- Append to `.spectral/registry/tasks.json`:
```json
{
  "id": "{TICKET_ID}",
  "title": "{TITLE}",
  "status": "PENDING",
  "priority": "{PRIORITY}",
  "remoteStatus": "{REMOTE_STATUS}"
}