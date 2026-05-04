# Spectral

Spectral is a plugin bundle for Copilot CLI built around composable skills and session hooks.

## How it works

Spectral is installed as a Copilot plugin. When a new session starts, the hook chain loads the plugin context and the Copilot skill loader discovers the skill files under `skills/`.

The important pieces are:

1. `hooks/hooks.json` tells the host which hook to run.
2. `hooks/run-hook.cmd` is the cross-platform wrapper that launches the hook script.
3. `hooks/session-start` injects startup context into the session.
4. `skills/*/SKILL.md` contains the skill metadata and instructions.

## Installation

**Note:** Installation differs by platform. Claude Code or Cursor have built-in plugin marketplaces. Codex and OpenCode require manual setup.

### Claude Code Official Marketplace

If you publish Spectral to the official Claude plugin marketplace, install it with:

```bash
/plugin install spectral@claude-plugins-official
```

### Claude Code (via Plugin Marketplace)

In Claude Code, register the marketplace first:

```bash
/plugin marketplace add <your-github-username>/spectral-marketplace
```

Then install the plugin from this marketplace:

```bash
/plugin install spectral@spectral-marketplace
```

### Cursor (via Plugin Marketplace)

In Cursor Agent chat, install from marketplace:

```text
/add-plugin spectral
```

or search for "spectral" in the plugin marketplace.

### Codex

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/<your-github-username>/spectral/refs/heads/main/.codex/INSTALL.md
```

**Detailed docs:** [docs/README.codex.md](docs/README.codex.md)

### OpenCode

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/<your-github-username>/spectral/refs/heads/main/.opencode/INSTALL.md
```

**Detailed docs:** [docs/README.opencode.md](docs/README.opencode.md)

### GitHub Copilot CLI

```bash
copilot plugin marketplace add srineelx23/spectral-marketplace
copilot plugin install spectral@spectral-marketplace
```

Windows note: Copilot CLI shell execution may require PowerShell 7 (`pwsh`). If `pwsh.exe` is unavailable, install it from https://aka.ms/powershell. Spectral init includes a no-shell fallback path, but script-driven init is the fastest and most token-efficient path.

### Gemini CLI

```bash
gemini extensions install https://github.com/<your-github-username>/spectral
```

To update:

```bash
gemini extensions update spectral
```

## Verify Installation

Start a new Copilot session and ask for something that should trigger a skill, such as planning a feature or debugging an issue. The agent should load the relevant skill automatically.

## Skills Library

Current skills in this repository:

### Collaboration
- `brainstorming` - Refine requirements and produce a design direction.
- `dispatching-parallel-agents` - Coordinate multiple agents in parallel.
- `executing-plans` - Run implementation plans in batches with checkpoints.
- `requesting-code-review` - Review completed work against the plan.
- `receiving-code-review` - Respond to review feedback.
- `using-git-worktrees` - Work in isolated branches and worktrees.
- `finishing-a-development-branch` - Wrap up and clean up after implementation.
- `subagent-driven-development` - Drive implementation with task-level subagents.
- `writing-plans` - Break a design into executable tasks.

### Testing and Debugging
- `test-driven-development` - Apply RED-GREEN-REFACTOR for implementation.
- `systematic-debugging` - Use a structured root-cause debugging process.
- `verification-before-completion` - Confirm fixes before closing work.

### Project Support
- `execute-task` - Execute a single focused task.
- `fetch-tickets` - Retrieve and select work items.
- `init` - Bootstrap a new workspace session.
- `update-jira-status` - Sync task progress back to Jira.

### Meta
- `writing-skills` - Create and verify new skills.

## Contributing

Skills live directly in this repository. To contribute:

1. Create a branch for your change.
2. Follow `skills/writing-skills/SKILL.md` for skill authoring guidance.
3. Submit a PR with the updated skill or hook content.
