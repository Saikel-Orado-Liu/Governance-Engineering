# Changelog

All notable changes to the `claude-template/` template.

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
