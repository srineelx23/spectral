---
name: token-optimization
description: "Intelligent task routing to minimize LLM token consumption. Detects task complexity and offers brainstorming bypass for simple features."
---

# Token Optimization: Smart Task Routing

Reduce LLM token consumption by **25-50%** through intelligent task routing based on complexity detection.

## How It Works

Before running the full workflow (brainstorming → planning → execution), analyze the task:

1. **Detect task complexity** — Count files touched, scope of changes, integration points
2. **Route intelligently** — Simple tasks skip brainstorming; complex tasks use full workflow
3. **Batch when possible** — Group multiple small features into single plan
4. **Model selection** — Use appropriate model tier for each task

## Task Complexity Heuristic

### Lightweight Tasks (Skip Brainstorming)

- **Files touched:** 1 single file
- **Scope:** Config update, single-file feature, bug fix, style change
- **Integration:** No multi-component coordination needed
- **Workflow:** `writing-plans → execution` (no brainstorming)
- **Token savings:** **25-35%** (skip brainstorming phase)

**Examples:**
- Add gradient background to hero section (CSS only)
- Update config parameter
- Fix bug in isolated function
- Add single UI component

**Detection prompt to ask user:**
> "This looks like a focused, single-file change. Want to skip brainstorming and jump straight to the implementation plan?"

### Standard Tasks (Full Workflow)

- **Files touched:** 2-3 files
- **Scope:** Multi-component feature with some integration
- **Integration:** Touches 2-3 related modules/components
- **Workflow:** `brainstorming → writing-plans → execution` (full)
- **Token cost:** Baseline

**Examples:**
- New user profile form (component + state + api call)
- Feature affecting multiple pages
- Cross-cutting concern (logging, error handling)

### Complex Tasks (Enhanced Review)

- **Files touched:** 4+ files
- **Scope:** Architectural change, significant refactor, multi-system integration
- **Integration:** Spans multiple domains or introduces new patterns
- **Workflow:** `brainstorming → writing-plans → execution + full code review`
- **Model selection:** Use most capable model throughout

**Examples:**
- State management restructure
- Authentication system redesign
- Multi-service API integration
- Database schema changes

## Batching: Multiple Small Tasks (Highest Savings)

When user has 3+ small features to implement:

**Old approach (per-feature):**
```
Feature 1: brainstorm(2KB) → plan(2KB) → execute = 6 KB processed
Feature 2: brainstorm(2KB) → plan(2KB) → execute = 6 KB processed
Feature 3: brainstorm(2KB) → plan(2KB) → execute = 6 KB processed
Total: 18 KB context processing
```

**Batched approach:**
```
Batch [Feature 1, 2, 3]: brainstorm(6KB) → plan(8KB) → execute in parallel = 14 KB processed
Total: 14 KB context processing
Savings: 22% fewer tokens
```

**When to suggest batching:**
- User mentions 3+ small features
- Features are independent (no dependencies)
- All are lightweight complexity

**Batch limit:** Group 3-5 small features max. Beyond 5, split into separate batches.

## Model Selection by Complexity

Minimize tokens by using the right model for each task:

| Task Complexity | Recommended Model | Token Impact |
|---|---|---|
| Lightweight (1 file) | Fast/cheap model | -20% from baseline |
| Standard (2-3 files) | Standard model | Baseline |
| Complex (4+ files) | Most capable model | +15-20% from baseline |

**Implementation:**
- Lightweight: Use Claude Haiku or equivalent cheap model for writing-plans + execution
- Standard: Use Claude Sonnet or standard tier
- Complex: Use Claude 3 Opus or most capable tier available

**Where to apply:**
- `spectral:writing-plans` — model selection for plan generation
- Task execution (subagent-driven-development) — route each task to appropriate model

## Context Reuse: Skip Redundant Processing

Once brainstorming produces a spec, reuse it throughout execution without re-parsing:

**Current flow (inefficient):**
1. Brainstorming generates spec → 1st API call processes project context
2. Execution re-reads spec → 2nd API call re-processes same spec

**Optimized flow:**
1. Brainstorming generates spec → API call
2. Pass spec directly via context to execution → skip re-parsing, focus only on implementation

**Implementation:** Store spec in `.spectral/current-spec.md` after brainstorming; execution reads directly without re-context-processing.

## Implementation Checklist

When routing a task:

- [ ] **Detect complexity** — Count files, assess integration scope
- [ ] **Suggest routing** — Offer lightweight skip for 1-file tasks
- [ ] **Check for batching** — If 3+ lightweight tasks exist, propose batching
- [ ] **Select model** — Use heuristic table above
- [ ] **Set context reuse** — Pass spec via `.spectral/current-spec.md` to execution
- [ ] **Announce savings** — Tell user the expected token reduction

## Examples

### Example 1: Lightweight Task (Gradient Background)

User: "Add a gradient background to the hero section"

Analysis:
- Files touched: 1 (hero.css or styles.tsx)
- Scope: UI styling only
- Integration: None
- **Complexity: LIGHTWEIGHT**

Response:
> "This is a focused, single-file styling change. I can skip the full brainstorming and jump straight to writing the implementation plan. This saves about 30% of LLM tokens.
>
> Want to proceed that way, or would you prefer the full brainstorming first?"

### Example 2: Standard Task (User Profile Form)

User: "Build a user profile edit form with validation and API integration"

Analysis:
- Files touched: 3 (form component, validation logic, api service)
- Scope: Multi-component feature
- Integration: Component + state + API
- **Complexity: STANDARD**

Response:
> "This will span multiple files (form component, validation, API integration). Let's run the full brainstorming → planning → execution workflow to lock in the design."

### Example 3: Multiple Lightweight Tasks (Batch)

User: "I need to add a dark mode toggle, update the footer text, and add a search icon to the header"

Analysis:
- Feature 1: 1 file (theme toggle)
- Feature 2: 1 file (footer text)
- Feature 3: 1 file (header icon)
- **Count: 3 lightweight tasks**

Response:
> "I see three independent, lightweight features here. Instead of running three separate workflows, I can batch them into a single brainstorming and plan session. This saves about 40% of tokens overall.
>
> Here's what I'll do:
> 1. Brainstorm all three features together
> 2. Create a unified plan with tasks for each
> 3. Execute them in parallel or sequence
>
> Sound good?"

## Avoiding Premature Optimization

**Do NOT skip brainstorming if:**
- User is uncertain about the approach
- Task involves architectural decisions
- Multiple design tradeoffs exist
- User wants to explore options first

Token savings are not worth sacrificing quality design. Only skip brainstorming when the approach is **obviously correct and unambiguous**.

---

## Integration with Other Skills

This skill works **upstream** of brainstorming:
1. User describes task → token-optimization detects complexity + routes
2. If lightweight + user approves skip → jump to `spectral:writing-plans`
3. If standard/complex or user wants full flow → proceed to `spectral:brainstorming`

This is a **decision point**, not a replacement for brainstorming. It's the intelligent router that chooses the right path.
