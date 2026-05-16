# Changelog

All notable changes to the `claude-template/` template.

---

## [V1.1] — 2026-05-16

### Schema Externalization & Inject-on-Demand

- **Removed inline output schemas** from all 11 Agent definitions. Output schemas now live solely in `.claude/schemas/` and are injected by Team Lead into each Fork prompt via the new Schema Injection Rule (see `.claude/rules/architecture.md`).

### Plan Agent Upgraded to Tech-Debt-Aware

- **Phase 0 — Tech debt analysis**: plan-agent now scans `.claude/agent-memory/orchestrator/tech-debt.yaml` plus source code for deprecated APIs, inconsistent patterns, duplicated code, naming violations, and module coupling before designing any architecture.
- **Detailed step specs**: each step now specifies `step_type`, `target`, `purpose`, `fields[]`, `functions[]`, and `tech_debt_warnings[]`. Algorithmic functions (new data structure or >20 LOC) require `algorithm_steps[]`.
- **Complexity re-tiered**: `small` (≤20 LOC, 1 file) | `medium` (21-50 LOC, or 2 files) | `large` (>50 LOC or ≥3 files).
- **Self-check expanded** from 6 to 10 items.

### New Memory Files

- Added `health-report.yaml` and `verified-patterns.yaml` under `.claude/agent-memory/summarize/` as structured templates.
- Reset `lessons-learned.yaml` to empty initial state (project-specific data removed).

### Pipeline Termination Rule

- `dispatcher.md`: after reporting results, the dispatcher **must stop immediately** — no follow-up questions, no new task cycles.
- `CLAUDE.md`: both simple and standard pipeline paths now end with `→ [终止]`.

### Skill Entry Points Adapted

- All 6 Skill entry points updated to inject external schema YAML into Fork prompts.

---

## [V1.0] — 2026-04-30

### Initial Release

- **CLAUDE.md** — Pure dispatcher-mode AI charter with `{{PLACEHOLDER}}` markers for project-specific content.
- **11 Agent Definitions** — 8 pipeline agents (confirm / explore / plan / developer / inspector / test / summarize / commit) + 3 offline agents (refactor / optimize / sync).
- **6 Skill Entry Points** — confirm (requirement triage) / plan (architecture design) / sync (VCS knowledge sync) / refactor (codebase health scan) / optimize (multi-approach evaluation) / init (project initialization engine).
- **13 YAML Communication Schemas** — Standardized inter-agent data exchange contracts for all pipeline and offline operations.
- **Architecture Rules** — Fork decision matrix, SIMPLE vs STANDARD dispatch, fault tolerance with checkpoint recovery, and YAML data isolation anti-injection rules.
- **Coding Standards Template** — Generic coding standards file for `/init` to generate stack-specific rules.
- **Team Shared Memory** — 3 sample memory structures (orchestrator tech-debt / summarize lessons-learned / sync last-sync).
- **Output Style** — Minimalist dispatcher style definition.
- **Project Settings** — PreToolUse / PostToolUse / Notification stage-gate hooks configuration.
- **Init Engine** — Agent definition + placeholder mapping (9 placeholders) + 4 coding-standards templates (C++/UE, Python, Rust, TypeScript/React) + project pattern library + validation script + eval cases.
- **.claudeignore** — Excludes build artifacts, dependency directories, and IDE-generated files from AI context.
