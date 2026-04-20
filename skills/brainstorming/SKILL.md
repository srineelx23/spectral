---
name: brainstorming
description: "Used to select tasks from the registry and generate technical specifications. Explores requirements and design before implementation."
---

# Task Selection and Specification

Select an active ticket and turn requirements into a formal design specification through deterministic analysis.

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
3. **Understand requirement** — Use `.spectral/code_index.json` as primary context
4. **Detect ambiguity** — Look for ambiguities impacting behavior or architecture
5. **Apply Clarification Gate** — If needed, ask all questions and wait
6. **Define assumptions** — Explicitly state any assumptions made
7. **Generate 2–3 approaches** — Include pros/cons for each
8. **Select best approach** — Select one with justification
9. **Define system design** — Map out components and flow
10. **Generate spec.md** — Save to `.spectral/tasks/{TICKET_ID}/spec.md`
11. **Perform self-review** — Check for placeholders and contradictions

## Context Usage

- Use `.spectral/code_index.json` as primary source
- Avoid unnecessary repository scanning

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
