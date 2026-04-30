---
name: init
description: "Use when initializing a new Spectral workspace. Creates the .spectral directory (templates, memory, and code index)."
---

# Spectral Init

Use this skill when the user wants to initialize a new Spectral workspace in the current working directory.

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

## Index-First Retrieval Requirement

After init, `.spectral/code_index.json` is the default source of truth for code discovery.

- Mandatory pre-step before any coding reasoning: load `.spectral/code_index.json`.
- Select top 3-5 relevant files using `featureTags`, `summary`, and `kind`.
- Explicitly state which files were selected and why, then continue with implementation.
- Do not run full-repository search as a default path.
- If a required file is missing from the index, state `Index is insufficient` and run minimal targeted folder search as fallback.

## Hard Rule

- The agent must not blindly scan the whole repository before consulting `.spectral/code_index.json`.
- The agent must not open random files before selecting relevant candidates from the index.

## Incremental Indexing Requirement

- Init must run code index generation in `incremental` mode.
- Incremental mode must reprocess only files with changed metadata (`mtime`/size) and remove deleted paths from the index.
- Unchanged files must be reused directly from the previous `.spectral/code_index.json` entry.

## Multi-Language Support Requirement

- Use Tree-sitter when a language grammar is available.
- For unsupported languages, fall back to a lightweight structural parser (imports, declarations) instead of failing.
- Unknown text-like files should still be indexed with minimal metadata so discovery remains language-agnostic.

## Copilot CLI Requirement

In Copilot CLI, after /spectral:init is activated, the agent must produce a fully drafted constitution via script output. It must not leave .spectral/memory/constitution.md as template placeholders.

If shell execution is unavailable (for example: `pwsh.exe` missing on Windows), the agent must switch to the no-shell path immediately and must not retry shell commands repeatedly.

## Steps

1. **Send an Immediate User Prompt**:
   - First response after activation must be a clear status message so the user knows init is running.
   - Use this exact message:
     - `Spectral init started. I am creating your .spectral workspace and preparing your project constitution. Please enter your project rules (bullet points are fine).`

2. **Build a Compact Rules Summary**:
   - Convert the user request into 3-8 short bullets.
   - Keep this summary concise to reduce token usage.
    - Keep it in memory as `<compact rules summary>` for script input.

**CRITICAL SEQUENCE**: You MUST complete the **Tech Stack Detection** (Step 6) and save `.spectral/memory/tech_stack.json` BEFORE finalizing the **Constitution**. The constitution must strictly reflect the versions detected.

**STRICT VERSIONING RULE**: You MUST strictly adhere to the technology versions defined in `tech_stack_json`. Never use modern patterns for legacy versions (e.g., Angular 21 patterns in an Angular 17 project) unless explicitly instructed.

3. **Execute Initialization Script Immediately**:
    - Do NOT create any fwhatiles manually before running the script.
    - Do NOT use shell commands for directory or file creation.
    - Directly run:
     - `node "<spectral-repo>/skills/init/scripts/init.js"`
    - Pass user rules via environment variable:
       - `SPECTRAL_INIT_RULES="<compact rules summary>"`

4. **If Script Fails -> Fallback**:
    - Only if the Node script execution fails, create files manually using file tools (NOT shell).

5. **No-Shell Fallback (File Tools Only)**:
    - Create these paths with file tools (NOT shell):
       - .spectral/memory/constitution.md
       - .spectral/templates/spec-template.md
       - .spectral/templates/plan-template.md
       - .spectral/templates/tasks-template.md
       - .spectral/templates/constitution-template.md
   - Infer project signals with file listing/search tools (for example: package.json, angular.json, src/, apps/, libs/).
   - Write a compact but concrete constitution directly to .spectral/memory/constitution.md using:
     - Project name from current directory
     - 5 concrete principles
     - **Tech Stack Enforcement section**: MUST include a rule to strictly adhere to the versions in `tech_stack.json`. For Angular, always follow the latest (v21) unless an older version is detected, in which case strictly follow that version.
     - User rules section (including prompts provided during init)
     - Workflow section
     - Governance section with current date
   - Never leave placeholders in .spectral/memory/constitution.md.
   - Keep output concise; avoid verbose narrative to reduce tokens.

6. **Tech Stack Detection (Existing Projects Only)**:
    - If the repository already contains source code, detect the tech stack before confirmation.
    - **Detection Rules (High Priority Files Only)**:
        - Check in this order:
            1. **Node.js / Frontend / Fullstack**: `package.json` (extract dependencies, devDependencies, engines.node), lock files (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`).
            2. **Python**: `requirements.txt`, `pyproject.toml`, `Pipfile` / `poetry.lock`.
            3. **Java**: `pom.xml`, `build.gradle`.
            4. **DevOps**: `Dockerfile`, `docker-compose.yml`, `.github/workflows/`.
            5. **Database**: dependencies (`mongoose`, `prisma`, `sequelize`, `sqlalchemy`, etc.), config files (`.env`, `config/`).
    - **Extraction Output Format**:
      Create structured output:
      ```json
      {
        "project_type": "",
        "frontend": { "framework": "", "version": "" },
        "backend": { "runtime": "", "framework": "", "version": "" },
        "database": "",
        "testing": [],
        "devops": [],
        "confidence": 0.0
      }
      ```
    - **Save Results**:
      1. Write JSON to: `.spectral/memory/tech_stack.json`
    - **Validation**:
      - If confidence < 0.8:
        Ask user: "I detected the following tech stack. Please confirm or correct it."
      - Do NOT leave files empty.

7. **Generate Code Index**:
    - Purpose: Create `.spectral/code_index.json`, a semantic metadata index of all project files.
    - This index is the **PRIMARY SOURCE OF TRUTH** for all index-first file discovery across skills.
    - **Index Structure** (version 2, metadata-only):
      ```json
      {
        "version": 2,
        "files": {
          "path/to/file.ts": {
            "language": "typescript|javascript|python|java|go|cpp|...",
            "kind": "module|service|component|util|config",
            "responsibility": "1-2 line description of what this file does",
            "summary": "Full summary with dependencies count and consumers",
            "featureTags": ["feature1", "feature2"],
            "dependsOn": ["path/to/dep1.ts", "path/to/dep2.ts"],
            "usedBy": ["path/to/consumer1.ts"],
            "functions": [{name, purpose, calls}],
            "mtimeMs": timestamp,
            "size": bytes
          }
        },
        "features": {
          "todo": {"files": ["src/todo/index.ts", "src/todo/service.ts"]},
          "auth": {"files": ["src/auth/login.ts", "src/auth/guard.ts"]}
        },
        "stats": {...}
      }
      ```
    - **Generation Process**:
      1. Run the code index generator:
         - **Command**: `node "<spectral-repo>/scripts/generate-code-index.js" --target <project-root> --out .spectral/code_index.json --mode full`
         - **Parameters**:
           - `--target`: Project root directory (defaults to cwd)
           - `--out`: Output path (defaults to `.spectral/code_index.json`)
           - `--mode`: `full` for complete reindex, `incremental` to reuse unchanged files
      2. The script will:
         - Scan all meaningful source files (JS/TS/Python/Java/Go/C++)
         - Extract semantic metadata: language, kind, responsibility, featureTags
         - Infer `kind` from file path patterns (components/, services/, utils/, etc.)
         - Derive `featureTags` from folder structure and content keywords
         - Resolve internal imports to build `dependsOn` and `usedBy` graphs
         - Build `features` map for deterministic feature-based file discovery
         - Validate: fail if features map is empty or files lack summaries
      3. Wait for completion and report:
         - Number of files scanned, reused, changed, new, deleted
         - Validation status: ✓ PASSED or ✗ FAILED with specific errors
    - **Validation Guarantees**:
      - Features map will never be empty (or generation fails)
      - Every file will have a non-empty summary and responsibility
      - Every file will have at least one featureTags entry (deterministic feature mapping)
      - Dependency graph will be bidirectional (dependsOn ↔ usedBy)
    - **Post-Generation**:
      - Commit `.spectral/code_index.json` to version control
      - Regenerate whenever major files are added/removed (or use `incremental` mode for fast updates)
      - Use as primary input for brainstorming, planning, and task execution

8. **Confirm**:
    - Verify that the `.spectral` structure is complete and report success.
    - Confirm that `.spectral/memory/constitution.md` contains concrete sections with no unresolved placeholder tokens.
    - Confirm that `.spectral/memory/tech_stack.json` exists and contains the detected or confirmed stack.
    - Confirm that `.spectral/code_index.json` exists and was generated as metadata-only output.
    - Confirm that `.spectral/code_index.json` is pretty-printed (multi-line JSON with 2-space indentation).
    - Confirm that `.spectral/code_index.json` validation passed (no empty features, all files have summaries).

9. **User Confirmation Loop**:
    - Show a concise summary of what was written.
    - Ask: `I drafted your constitution in .spectral/memory/constitution.md, detected your tech stack in .spectral/memory/tech_stack.json, and generated your code index in .spectral/code_index.json. What would you like to change?`
    - If user provides edits, update the constitution, tech stack, or trigger code index regeneration immediately.