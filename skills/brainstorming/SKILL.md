---
name: brainstorming
description: "Used to select tasks from the registry and generate technical specifications. Explores requirements and design before implementation."
---

# Task Selection and Specification

Select an active ticket and turn requirements into a formal design specification through deterministic analysis.

## Code Index Usage Rule

## INDEX-FIRST EXECUTION POLICY

- code_index.json is the primary source of truth
- repository search is a last resort
- file discovery MUST happen through index
- repeated file reads are prohibited
- task execution must minimize context size

If index is available, ignoring it is considered a failure.

This rule is mandatory and applies before any file read, file search, or repository scan.

1. Load and consult `.spectral/code_index.json` first.
2. Use index metadata to understand feature boundaries, relevant modules, and dependencies before reading any file.
3. Replace directory scanning with index lookup.
4. Replace file discovery with feature mapping.
5. Start from `featureTags`, then validate targets through file `summary` and `responsibility`.
6. Expand only through `dependsOn` when strictly required.
7. Do not use grep/glob when index entries are relevant and available.
8. Prefer index summaries over file reads.
9. Maximum files to read during brainstorming: 2.
10. If index summaries are sufficient, do not read files at all.

## Enforced Index Refresh Gate

Before any specification work begins, the agent MUST ensure `.spectral/code_index.json` exists and is current.

1. Check whether `.spectral/code_index.json` exists.
2. If it is missing, regenerate it with `--mode incremental` before continuing.
3. If the workspace has changed since the index was generated, regenerate it with `--mode incremental` before continuing.
4. If regeneration fails, stop and report `Index is insufficient`.
5. Do not proceed to spec writing, file reads, or task selection until the refreshed index is available and valid.

<HARD-GATE>
Do NOT:
- write code
- generate implementation steps
- define file paths
- invoke implementation skills

ONLY produce the specification.
</HARD-GATE>
 
## Task Selection

- Load `.spectral/registry/tasks.json`
- Identify tickets with status = PENDING
- Display available tickets (id, title, priority)
- Ask user to select one ticket ID
- Set selected ticket as active

- Update status:
  - PENDING → ONGOING

Update in:
- `.spectral/registry/tasks.json`
- `.spectral/tasks/{TICKET_ID}/ticket.md`

- Only ONE ticket can be ONGOING at a time

## Execution Mode

- Perform structured reasoning in a single pass
- Avoid multi-turn conversations
- Do not rely on iterative questioning unless required

## Clarification Gate

- If requirements are clear → proceed
- If ambiguity exists that affects behavior or architecture:
  1. Generate a "Clarifications Needed" section
  2. Ask ALL critical questions in one block
  3. STOP execution
  4. Resume after user response
- Do NOT ask questions one-by-one
- Do NOT proceed with unresolved critical ambiguity

## Workflow

1. **Select active ticket** — From `.spectral/registry/tasks.json`
2. **Load ticket** — Read `.spectral/tasks/{TICKET_ID}/ticket.md`
3. **Refresh index gate** — Ensure `.spectral/code_index.json` exists and is current before any further reasoning. If missing or stale, regenerate it in incremental mode and validate the output.
4. **Understand requirement** — Use `.spectral/code_index.json` as primary context for feature boundaries, module mapping, and dependency expansion
5. **Detect ambiguity** — Look for ambiguities impacting behavior or architecture
6. **Apply Clarification Gate** — If needed, ask all questions and wait
7. **Detect Tech Stack** — Load `.spectral/memory/tech_stack.json` to ensure design approach is compatible with the project's tech stack.
8. **Define assumptions** — Explicitly state any assumptions made
9. **Generate 2–3 approaches** — Include pros/cons for each
10. **Select best approach** — Select one with justification
11. **Define system design** — Map out components and flow
12. **Generate spec.md** — Save to `.spectral/tasks/{TICKET_ID}/spec.md`
13. **Perform self-review** — Check for placeholders and contradictions

## Context Usage

- Use `.spectral/code_index.json` as primary source
- Replace repository scanning with index lookup and feature mapping
- Prefer summaries in the index over opening files
- Do not use grep/glob when index has relevant entries
- Read at most 2 files during brainstorming, and only if summaries are insufficient

## Spec Output

- Create file: `.spectral/tasks/{TICKET_ID}/spec.md`
- The spec MUST be stored inside the selected ticket folder
- Do NOT store specs in global `specs/` directories
- Use the provided template from `.spectral/templates/spec-template.md`

## Spec Structure

`spec.md` must include:
- **Overview**: Brief description of the feature and its purpose
- **Requirements**: Functional and non-functional requirements
- **Acceptance Criteria**: Defined as Gherkin (Given/When/Then)
- **Assumptions**: Resolved assumptions from missing info
- **Design Decisions**: Chosen approach and justification
- **System Flow**: Step-by-step system execution
- **Components**: Responsibilities of services/modules
- **Edge Cases**: Failure scenarios and boundary conditions

## Self-Review

Ensure:
- No TODO/TBD/placeholders
- No ambiguity
- No contradictions
- Scope is focused
- No unnecessary features (YAGNI)

Fix issues inline.

## Transition

- Once the spec is written and self-reviewed, proceed to the `spec-review` step before planning.
- Do NOT invoke implementation skills yet.
