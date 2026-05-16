# Governance Engineering — Usage Guide

Complete instructions from initialization to daily development

---

## 1. Prerequisites

### Prerequisites

- [Claude Code](https://claude.com/claude-code) CLI installed and logged in
- A Git repository (either new or existing project)
- Basic command-line proficiency

### Checklist

```bash
# Verify Claude Code is available
claude --version

# Confirm you are in the project root
cd /path/to/your/project
git status
```

---

## 2. Quick Start (5 minutes)

### 2.1 Copy the template

```bash
# Copy the template from the Governance Engineering repository to your project
cp -r /path/to/Governance-Engineering/claude-template/. .
```

The template includes:

| Path                     | Content               | Description                                 |
| ------------------------ | --------------------- | ------------------------------------------- |
| `CLAUDE.md`              | AI Constitution       | Pure dispatcher-mode entry point            |
| `.claude/agents/`        | 11 Agent definitions  | Pipeline + offline Agents                   |
| `.claude/skills/`        | 5 Skill entry points  | confirm / plan / sync / refactor / optimize |
| `.claude/schemas/`       | Communication Schemas | Data exchange standards between Agents      |
| `.claude/rules/`         | Path-matching rules   | Architecture constraints + coding standards |
| `.claude/agent-memory/`  | Team memory           | Cross-session knowledge persistence         |
| `.claude/output-styles/` | Output styles         | Dispatcher style                            |

### 2.2 Initialize

In the Claude Code conversation, enter:

```text
/init
```

The Init Agent will automatically:

1. Scan the project tech stack (language, framework, build system)
2. Replace `{{PLACEHOLDER}}` in `CLAUDE.md` with actual values
3. Generate draft module cards (`docs/ai/modules/`)
4. Configure coding standard rule sets

> [!TIP]
> `/init` does not automatically install MCP tools. If you need specific MCP integrations (e.g., ue-mcp), explicitly tell the AI during initialization: "My project needs ue-mcp integration."

### 2.3 Verify

After initialization completes, confirm the following files have been generated:

```bash
ls CLAUDE.md
ls docs/ai/modules/
ls docs/ai/standards/
```

---

## 3. Daily Workflow

The Governance Engineering workflow is automated. You only need to describe the requirement — the dispatcher automatically routes it to the correct pipeline.

### 3.1 Standard workflow (complex requirements)

```
Your requirement description
  → confirm Agent: Restates the requirement, identifies ambiguities, awaits your confirmation
  → explore Agent: Searches the codebase, analyzes impact scope
  → plan Agent: Generates an implementation plan, lists files to modify
  → developer Agent: Executes code changes
  → inspector Agent: Independently reviews code changes
  → test Agent: Runs the test suite
  → summarize Agent: Generates a change summary
  → commit Agent: Commits the code
```

### 3.2 Simplified workflow (simple requirements)

When the dispatcher determines the requirement is simple (`simplicity_score >= 70`), it automatically takes the simplified path:

```
Your requirement description
  → confirm Agent: Confirms the requirement
  → developer Agent: Directly executes changes
  → summarize Agent: Generates a summary
  → commit Agent: Commits
```

This skips the explore and plan phases, saving approximately 40% of the time.

### 3.3 Real conversation examples

**Standard requirement:**

> User: Add a user login feature supporting email and password login, with account lockout for 30 minutes after 5 failed attempts.

The dispatcher automatically Forks confirm Agent → confirm outputs a restatement → you confirm → Fork explore Agent → Fork plan Agent → you approve the plan → Fork developer Agent → Fork inspector Agent → Fork test Agent → Fork commit Agent.

**Simple requirement:**

> User: Change the port in the config file from 3000 to 8080.

The dispatcher determines simplicity_score = 95 → Fork confirm Agent → Fork developer Agent → completes directly.

---

## 4. Command Reference

### 4.1 `/init`

Initializes the project governance structure. Only needs to be run once.

```text
/init
```

**When to use**: When first adopting Governance Engineering for a project.

**Output**: Adapted `CLAUDE.md`, `docs/ai/modules/`, `docs/ai/standards/`.

### 4.2 `/optimize <plan description>`

Compares multiple architectural approaches and outputs a recommendation.

```text
/optimize Should the user authentication system use JWT or Session?
```

**When to use**: Before starting to code, when multiple feasible approaches exist.

**Output**: Comparative analysis + recommended approach + rationale.

### 4.3 `/refactor`

Full codebase health scan.

```text
/refactor
```

**When to use**: At milestone checkpoints, when code quality has significantly degraded.

**Output**: Health report + auto-fixes + improvement suggestions.

### 4.4 `/sync`

Synchronizes manual changes back to the AI knowledge base.

```text
/sync
```

**When to use**: When you have manually modified code outside of Claude Code, or manually modified files in Claude Code that are outside AI jurisdiction.

**Output**: Updates relevant entries in `docs/ai/modules/` and `docs/ai/standards/`.

### 4.5 Automated pipeline (no manual invocation needed)

In daily development, the following flow is triggered automatically — you don't need to call any commands manually:

```
confirm → plan → develop → inspect → test → commit
```

You only need to describe the requirement; the dispatcher handles the rest.

---

## 5. Best Practices

### 5.1 Requirement description

- **Be as specific as possible.** "Add a REST API endpoint that accepts a JSON body `{name, email}`, returns 201 Created and a user ID, with input validation: name is required, email must be a valid format" is far better than "Add a user API."
- **Include edge cases.** Specify how exceptions should be handled.
- **Indicate the scope involved.** "This change only affects the auth module and the user module."

### 5.2 Confirmation stage

- **Read the confirm Agent's output carefully.** This is the most important quality gate.
- **If the confirm output is wrong → correct it directly.** Do not let an incorrect confirmation enter the plan phase.
- **Flag areas of uncertainty.** "I'm not sure about part X; proceed with approach A for now."

### 5.3 Plan approval

- **The plan output requires your explicit approval.** No approval means no execution.
- **Pay attention to the list of files to be modified.** If the plan intends to modify files you don't want touched, raise it immediately.
- **Just say "read-only" if you don't have permission.** The AI will not forcefully modify files.

### 5.4 Review stage

- **The inspector Agent is independent from the developer Agent.** It does not see the plan's details, ensuring a truly "blind review."
- **If the inspector finds issues, the developer will automatically re-apply changes.**
- **Maximum 3 retries.** After 3 compilation failures, the issue is escalated to manual handling.

### 5.5 Knowledge base maintenance

- **Always run `/sync` after manually modifying code** — otherwise the AI knowledge base will be out of sync with the code.
- **Run `/sync` after adding new modules** — so the AI knows about the new module's existence.

---

## 6. FAQ

### Q: Why doesn't the AI start writing code immediately?

A: This is the design intention of Governance Engineering. The AI must first confirm (verify understanding of the requirement), because most quality issues stem from unclear requirements. The confirm stage ensures the AI and you are aligned.

### Q: What if confirmation takes too long?

A: For simple requirements (changing a config, fixing a typo), the dispatcher automatically takes the simplified path, and confirmation is very fast. If confirmation for a complex requirement is too slow, it may mean your requirement description needs more detail — more specific input leads to faster confirmation.

### Q: What if the conversation suddenly freezes?

A: This is a known Claude Code compatibility issue (see version notes). The AI may have completed its task, but the visual interface hasn't updated. Try: 1) Wait 30 seconds; 2) Enter `/clear` to refresh the conversation; 3) Reopen the project. Code changes are usually already saved.

### Q: Is Governance Engineering suitable for small projects?

A: Not really. For single-file scripts or minimal projects, the process overhead of Governance Engineering outweighs the benefits. It is recommended for projects with more than 5 files, team collaboration, or high code quality requirements.

### Q: How can I skip certain steps?

A: Skipping is not recommended. However, if you are certain you don't need the plan phase, you can directly say "Skip the plan, just implement it." The dispatcher will respect this instruction.

### Q: What if the AI is missing specific tools (e.g., MCP)?

A: During `/init` or in conversation, explicitly tell the AI: "My project uses ue-mcp." The AI will adjust its architecture configuration accordingly. If you discover a missing tool only at runtime, simply tell the main conversation AI to install it.

---

## 7. Advanced Usage

### 7.1 Changing Models & Adjusting Thinking Budgets

Governance Engineering's default model assignments are based on common API models (haiku/sonnet/opus). Your model provider may differ from the defaults, or you may need deeper thinking for specific stages.

**Changing an Agent's model**: Edit `.claude/agents/<agent-name>.md` and modify the `model` field:

```yaml
# Example: Switch developer Agent to DeepSeek V4
model: deepseek-v4
# Or use Claude Opus for maximum quality
model: claude-opus-4-7
```

**Adjusting thinking budget**: For Agents requiring deep reasoning (plan, developer), you can specify a thinking budget in the Agent definition:

```yaml
# Increase thinking budget for developer Agent (suitable for complex code generation)
model: claude-sonnet-4-6
thinking:
    budget_tokens: 4000
```

**Changing the main conversation model**: The main conversation AI (Orchestrator) uses the model configured in Claude Code settings. Agent model assignments in `CLAUDE.md` do not affect the main conversation:

```bash
# Switch the main conversation model via /config
/config model claude-sonnet-4-6
```

**Recommended model assignment strategy**:

| Task Type                                                        | Recommended Model                                                     | Reason                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| confirm / explore / inspector / test / summarize / commit / sync | Lightweight model (e.g. claude-haiku, deepseek-chat)                  | Structured tasks requiring low reasoning    |
| plan / developer / refactor / optimize                           | High-performance model (e.g. claude-sonnet, claude-opus, deepseek-v4) | Deep reasoning and code generation required |
| Main conversation Orchestrator                                   | Mid-tier model                                                        | Dispatching only, no core task execution    |

> [!NOTE]
> The models you use may differ from the default configuration. Adjust each Agent's `model` field to your available API access. The weaker the model, the more important the process constraints become — good processes compensate for weaker models.

### 7.2 Integrating Linters & Testing Tools

**Integrating Linter into the test Agent**: The default test Agent only runs your test suite. You can modify it to also run Linter checks.

Edit `.claude/agents/test.md` to add Linter execution steps:

```yaml
# Extend test Agent's execution steps
steps: 1. Run the project test suite (npm test / pytest / cargo test etc.)
    2. Run Linter check (see language-specific commands below)
    3. If either tests or Linter fail, report the failure reason and return to developer for fixes
```

**Common Linter integration commands**:

| Stack                 | Linter Command                | Installation                                                            |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| TypeScript/JavaScript | `npx eslint . --format json`  | `npm install -D eslint`                                                 |
| Python                | `ruff check .` or `flake8 .`  | `pip install ruff`                                                      |
| Rust                  | `cargo clippy -- -D warnings` | Built-in                                                                |
| Go                    | `golangci-lint run`           | `go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest` |
| C++                   | `clang-tidy -p build/`        | Install via apt/brew                                                    |

**Custom test hooks**: Configure a PostToolUse hook in `.claude/settings.json` to auto-trigger Linter after every file modification:

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Edit|Write",
                "hooks": [
                    {
                        "type": "command",
                        "command": "npx eslint --fix ${CLAUDE_TOOL_FILE_PATH} || true"
                    }
                ]
            }
        ]
    }
}
```

### 7.3 Adding MCP Support

Governance Engineering templates do not automatically configure MCP tools. You need to add them manually.

**Step 1 — Install MCP server**: Using ue-mcp as an example:

```bash
# Register the MCP server in Claude Code
claude mcp add ue-mcp -- <install command>
```

**Step 2 — Inform the Init Agent**: If you're in the project initialization phase, tell the AI:

```text
/init
My project needs the following MCP integrations:
- ue-mcp (Unreal Engine editor interaction)
- List any other MCP tools as well

Please ensure the architecture configuration accounts for the capability boundaries of these tools.
```

**Step 3 — Update Agent permissions**: For Agents that need MCP tools, edit their definition files to add permissions:

```yaml
# Example: Add ue-mcp permissions to explore Agent
model: haiku
permissions:
    - Read
    - Search
    - mcp__ue-mcp__*
    - Grep
```

**Step 4 — Update routing rules**: Add MCP-related routing rules in `CLAUDE.md`:

```markdown
## MCP Integration

- For Unreal Engine operations, fork the explore Agent (configured with ue-mcp)
- ue-mcp operations include: asset operations, level editing, blueprint read/write, animation editing, etc.
```

**Common MCP integration scenarios**:

| MCP Tool       | Purpose                         | Agents needing permission |
| -------------- | ------------------------------- | ------------------------- |
| ue-mcp         | Unreal Engine editor operations | explore, developer        |
| github-mcp     | GitHub Issues/PR management     | plan, summarize, commit   |
| postgres-mcp   | Database queries                | explore, developer, test  |
| filesystem-mcp | Cross-project file access       | explore, sync             |

### 7.4 Custom Agents

Edit `.claude/agents/<agent-name>.md` to modify an Agent's behavior and permissions.

```yaml
# Example: Add the Sonnet model to the developer Agent
model: sonnet
permissions:
    - Read
    - Write
    - Edit
    - Bash
```

### 7.5 Extending workflows

Add new Skill files under `.claude/skills/`, then register them in `CLAUDE.md` to extend the workflow.

### 7.6 Health monitoring

Monitor five key metrics:

| Metric                   | Healthy Threshold                             | Warning Threshold |
| ------------------------ | --------------------------------------------- | ----------------- |
| Knowledge coverage       | >80% modules have cards                       | <60%              |
| Review interception rate | 10-30% issues found by inspector              | <5%               |
| First-pass success rate  | >60% developer compilations pass on first try | <30%              |
| Manual escalation rate   | <10% tasks escalated to human                 | >25%              |
| Sync latency             | Sync within 24h of manual changes             | >48h              |
