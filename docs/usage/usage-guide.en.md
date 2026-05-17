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
| `.claude/agents/`        | 12 Agent definitions  | Pipeline + offline Agents                   |
| `.claude/skills/`        | 6 Skill entry points  | confirm / plan / sync / refactor / optimize / init |
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

1. **Detect your language** from your input (Chinese / English), or ask if ambiguous
2. **Scan the project tech stack** (language, framework, build system, VCS)
3. **Recommend MCP tools** matching your tech stack (from the `mcp-compatibility.yaml` lookup table), with optional web search for new tools — ask you which to install
4. **Replace `{{PLACEHOLDER}}`** in `CLAUDE.md` with actual values
5. **Generate `vcs-config.yaml`** adapted to your VCS (Git / SVN / Perforce / Mercurial / Plastic SCM)
6. **Generate draft module cards** (`docs/ai/modules/`) and coding standard rule sets

> [!TIP]
> If `/init` detects your tech stack matches known MCP tools, it will proactively suggest them. You can also explicitly request specific MCP integrations: "My project needs ue-mcp integration."

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

### Q: Is Governance Engineering suitable for small projects?

A: Not really. For single-file scripts or minimal projects, the process overhead of Governance Engineering outweighs the benefits. It is recommended for projects with more than 5 files, team collaboration, or high code quality requirements.

### Q: How can I skip certain steps?

A: Skipping is not recommended. However, if you are certain you don't need the plan phase, you can directly say "Skip the plan, just implement it." The dispatcher will respect this instruction.

### Q: How do I install MCP tools?

A: V1.2's `/init` automatically recommends MCP tools matching your tech stack. If you need to add MCP later: run `claude mcp add <name> -- <install-command>` in the terminal, then run `/sync` — sync-agent will detect the new MCP and report it as a tool gap with guidance on which Agent definitions to update.

### Q: How do I change the AI's reply language?

A: The reply language is determined during `/init` (auto-detected from your input). To change it later, edit `.claude/settings.json` and modify the `language` field. To change Agent thinking language, edit `.claude/rules/language.md` (generated by `/init`).

---

## 7. Advanced Usage

### 7.1 Changing AI Reply Language

The AI's reply language is determined during `/init` (auto-detected from your input text). To change it afterward:

**Change the main conversation language**: Edit `.claude/settings.json`:

```json
{
    "language": "English"
}
```

**Change Agent thinking language**: Edit `.claude/rules/language.md` (generated by `/init`). This file is auto-injected into every Agent's context.

**Re-initialize with a different language**: Run `/init` again and specify your language explicitly in the same message:

```text
/init I want the AI to communicate in English
```

### 7.2 Changing Models & Adjusting Thinking Budgets

Governance Engineering's default model assignments are based on common API models (haiku/sonnet/opus). Your model provider may differ from the defaults.

**Changing an Agent's model**: Edit `.claude/agents/<agent-name>.md` and modify the `model` field:

```yaml
# Example: Switch developer Agent to DeepSeek V4
model: deepseek-v4
# Or use Claude Opus for maximum quality
model: claude-opus-4-7
```

**Adjusting thinking budget**: For Agents requiring deep reasoning (plan, developer), specify a thinking budget:

```yaml
model: claude-sonnet-4-6
thinking:
    budget_tokens: 4000
```

**Changing the main conversation model**:

```bash
/config model claude-sonnet-4-6
```

| Task Type                                                        | Recommended Model                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| confirm / explore / inspector / test / summarize / commit / sync | Lightweight model (e.g. haiku, deepseek-chat)                         |
| plan / developer / refactor / optimize                           | High-performance model (e.g. sonnet, opus, deepseek-v4)               |
| Main conversation Orchestrator                                   | Mid-tier model                                                        |

### 7.3 Multi-VCS Support

V1.2 replaces hardcoded Git commands with a VCS-agnostic layer. The template supports **Git, SVN, Perforce, Mercurial, and Plastic SCM** out of the box.

**How it works**: `/init` detects your VCS and generates `.claude/vcs-config.yaml`:

```yaml
vcs:
  type: git                     # git | svn | p4 | hg | plastic
  commands:
    status: "git status"
    diff: "git diff"
    stage: "git add"
    commit_base: "git commit"
    commit_template: "git commit {files} -m {message}"
  auto_mark: "[AI]"
```

Commit-agent and sync-agent both read this file — no Agent definition changes needed when switching VCS.

**Switching VCS after init**: Edit `.claude/vcs-config.yaml` and update the `type` and `commands` fields. No Agent files need modification.

### 7.4 MCP Tool Management

**Auto-recommendation during `/init`**: The init engine queries `mcp-compatibility.yaml` — a lookup table mapping tech stacks to MCP tools. If your stack matches, `/init` proactively suggests relevant MCP tools and asks which to install.

**Adding MCP after initialization**:

```bash
# Install the MCP server
claude mcp add ue-mcp -- <install command>
```

Then run `/sync` — sync-agent detects the new MCP in `settings.json` and reports a **tool gap**: which MCP is installed but not yet injected into any Agent's `tools:` list. It provides guidance on which Agent definitions to update.

**Manual Agent permission update**: Edit `.claude/agents/<agent-name>.md`:

```yaml
permissions:
    - Read
    - Search
    - mcp__ue-mcp__*
    - Grep
```

| MCP Tool       | Purpose                         | Typical Agents           |
| -------------- | ------------------------------- | ------------------------ |
| ue-mcp         | Unreal Engine editor operations | explore, developer       |
| github-mcp     | GitHub Issues/PR management     | plan, summarize, commit  |
| postgres-mcp   | Database queries                | explore, developer, test |
| filesystem-mcp | Cross-project file access       | explore, sync            |

### 7.5 Integrating Linters

Edit `.claude/agents/test-agent.md` to add Linter steps. Or configure a PostToolUse hook in `.claude/settings.json`:

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Edit|Write",
                "hooks": [{
                    "type": "command",
                    "command": "npx eslint --fix ${CLAUDE_TOOL_FILE_PATH} || true"
                }]
            }
        ]
    }
}
```

| Stack                 | Linter Command                |
| --------------------- | ----------------------------- |
| TypeScript/JavaScript | `npx eslint . --format json`  |
| Python                | `ruff check .`                |
| Rust                  | `cargo clippy -- -D warnings` |
| Go                    | `golangci-lint run`           |
| C++                   | `clang-tidy -p build/`        |

### 7.6 Structured Knowledge Base

V1.2 introduced machine-queryable YAML schemas for the AI knowledge base.

**ADR (Architecture Decision Records)**: Now stored as `docs/ai/decisions/ADR-<NNN>.yaml` instead of markdown. Key fields:

```yaml
adr:
  id: ADR-001
  status: accepted          # proposed | accepted | deprecated | superseded
  supersedes: null          # replaces previous ADR
  superseded_by: null       # replaced by newer ADR
  context:
    problem: "<2 lines max>"
    alternatives:
      - {id: A, rejected_reason: "<1 line>"}
  decision:
    reason: "<2 lines max>"
  consequences:
    positive: ["<1 line each>"]
    negative: ["<1 line each>"]
```

**Module cards**: Stored as `docs/ai/modules/<name>.yaml` with enum-typed fields (`public_interface.classes[].role`, `constraints[].type`, `constraints[].severity`). Machine-queryable — plan-agent can discover constraints by filtering `constraints[].type` and `constraints[].severity` before architecture design.

### 7.7 Health Monitoring

After each task, summarize-agent writes a health snapshot to `summarize_report.health`:

| Area                 | Tracked                                            |
| -------------------- | -------------------------------------------------- |
| Lessons learned      | Entry count vs. limit; severity distribution       |
| Verified patterns    | Proven pattern count; usage verification frequency |
| Tech debt            | Total entries; breakdown by critical/major/minor   |
| Issues by type       | Pattern violations, API misuse, missing guards     |

Long-term metrics to watch:

| Metric                   | Healthy Threshold      | Warning Threshold |
| ------------------------ | ---------------------- | ----------------- |
| Knowledge coverage       | >80% modules have cards | <60%              |
| Review interception rate | 10-30%                 | <5%               |
| First-pass success rate  | >60%                   | <30%              |
| Sync latency             | <24h                   | >48h              |

### 7.8 Custom Agents & Workflow Extension

Edit `.claude/agents/<agent-name>.md` to modify behavior, model, and permissions. Add new Skill files under `.claude/skills/` and register them in `CLAUDE.md`. Follow existing Agent/Skill files as templates — every Agent has a corresponding output Schema in `.claude/schemas/`.
