# Changelog

All notable changes to the Governance Engineering methodology and reference implementation.

---

## [V1.0] — 2026-04-30

### Initial Release

- **Five Design Principles**: Specialization, Standardized Process, Institutionalized Knowledge, Explicit Requirements, Layered Review.
- **Three-Layer Architecture Model**: Orchestrator (L0) → Domain → Execution (L1) → Knowledge (L2).
- **11 Specialized Agents**: 8 pipeline agents (confirm / explore / plan / developer / inspector / test / summarize / commit) + 3 offline agents (refactor / optimize / sync).
- **Stage-Gate Hooks**: PreToolUse / PostToolUse / Notification automated checkpoints that prevent workflow steps from being skipped.
- **Structured Memory System**: 5-layer shared memory hierarchy (Conversation → Agent Memory → Module Cards → Standards Rules → Git History).
- **Template Directory `claude-template/`**: Out-of-the-box project configuration including Agent definitions, Skill entry points, communication Schemas, and rule files.
- **Pure Dispatcher Pattern**: The main conversation AI never directly executes code operations; all work is delegated to forked sub-agents.
- **Dual-Path Dispatch**: Simple tasks take the simplified path (skip explore/plan); complex tasks follow the full standard pipeline.
- **Academic Documentation**: `Governance Engineering — Theory & Design` — methodology comparison, five design principles, three-layer architecture, model tiering & cost control.
- **Implementation Documentation**: `Governance Engineering — UE5 Reference Implementation` — complete Claude Code implementation guide with runnable templates.
- **Example Projects**: task-board / turn-based-strategy / markdown-ssg / scientific-computing / ue5 — covering 5 different tech stacks.
