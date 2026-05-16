<h1 align="center">Governance Engineering</h1>

<h4 align="center">A Management-Methodology Approach to Quality Assurance in AI-Assisted Software Development</h4>

<p align="center">
  <a href="../../LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/status-active-brightgreen.svg" alt="Status">
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/methodology-v1.0-orange.svg" alt="Methodology">
  </a>
</p>

<p align="center">
  <a href="README.en.md">English</a> · <a href="README.zh.md">简体中文</a>
</p>

<p align="center">
  Governance Engineering maps proven management principles — specialization, standardized processes, institutionalized knowledge, explicit requirements, and layered review — into AI-assisted development workflows. It answers <em>what constraint system to build</em>, complementing <a href="https://openai.com/index/harness-engineering/">Harness Engineering</a>'s focus on <em>how to constrain AI behavior</em>.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture-overview">Architecture Overview</a> •
  <a href="#version-roadmap">Version & Roadmap</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#example-projects">Example Projects</a> •
  <a href="#core-tenet">Core Tenet</a> •
  <a href="#a-note-to-readers">A Note to Readers</a> •
  <a href="#license">License</a>
</p>

---

## Quick Start

Copy the contents of the `claude-template/` folder into your project:

```bash
cp -r claude-template/. .
```

Then let `/init` adapt it to your stack:

```text
/init
```

Compare architecture approaches before committing to one:

```text
/optimize <your idea>
```

Full codebase health scan at milestones:

```text
/refactor
```

Sync manual edits back into the AI knowledge base:

```text
/sync
```

Every dev task auto-flows through `confirm → plan → develop → inspect → test → commit`. Describe what you want — the dispatcher handles the rest.

---

## Architecture Overview

### Why Governance Engineering

When we use AI to write software, we keep hitting the same kinds of failures: **inconsistent output, forgotten context, tangled responsibilities, unverified assumptions**. These are not AI problems. They are **management problems**.

Human software teams suffered from exactly these issues — until we invented division of labor, coding standards, code review, design documents, and CI/CD pipelines. Those were not technical inventions; they were **organizational inventions**.

> The quality issues that arise when using AI for software development are **structurally isomorphic** to those that emerge in human teams operating without effective management.

If this is true, then the solution is not better prompts or smarter models — it is **better governance**. Governance Engineering maps five core management principles into AI-assisted development workflows:

| Management Principle            | AI Workflow Equivalent                                |
| ------------------------------- | ----------------------------------------------------- |
| **Specialization**              | Specialized agents with narrow, well-defined scopes   |
| **Standardized Process**        | Stage-gate hooks that enforce workflow checkpoints    |
| **Institutionalized Knowledge** | Shared memory structures that persist across sessions |
| **Explicit Requirements**       | Structured task definitions with acceptance criteria  |
| **Layered Review**              | Multi-agent review pipelines with distinct concerns   |

Governance Engineering and [Harness Engineering](https://openai.com/index/harness-engineering/) are complementary layers. Harness Engineering provides the mechanisms to constrain AI; Governance Engineering provides the design rationale for which constraints to apply and why.

### Architecture Features

- 🏛️ **Management-Theoretic Foundation** — Based on verified organizational design principles, not ad-hoc heuristics
- 🤖 **11 Specialized Agents** — Each with a narrow scope, explicit interfaces, and defined communication schemas
- 🔒 **Stage-Gate Hooks** — Automatic checkpoints that prevent workflow steps from being skipped
- 🧠 **Structured Memory** — Team-shared memory hierarchy that persists knowledge across sessions
- 🔌 **Tech-Stack Agnostic** — Applies to any stack; templates generate stack-specific configuration
- 📐 **Layered Architecture** — Three-layer model (Orchestrator → Domain → Execution) for scalable complexity
- 📊 **Model Tiering & Cost Control** — Different agents are assigned models of different capability levels by task complexity, with context-window budgeting as a first-class concern

### Strengths

- **Reduces variance.** Structured workflows produce more consistent AI output than unstructured prompting.
- **Scales with complexity.** The more agents and steps in a project, the more governance pays for itself.
- **Tool-agnostic principles.** The design principles apply regardless of which AI coding assistant you use.
- **Persistent knowledge.** Memory structures survive session restarts and model changes.
- **AI model separation.** Conventional Skill approaches use a unified model for all conversations — search, confirmation, and sync tasks all consume expensive models. Governance Engineering's agent architecture tiers by task: lightweight models handle search and bookkeeping, while high-quality models are reserved for core tasks like code generation, dramatically reducing overall costs.
- **Context isolation.** Sub-agents operate in independent context windows, freeing the main conversation from carrying the full context load — the main dialogue's context can stay below 40% utilization while maintaining peak output quality. Each agent's domain context remains tightly focused, avoiding the attention dilution common in long-context scenarios.

### Limitations

- **Upfront investment.** Configuring agents, hooks, and memory structures takes time before writing any feature code.
- **Not for one-shot scripts.** The overhead is wasted on tasks that fit in a single prompt.
- **Learning curve.** The methodology assumes familiarity with organizational design concepts.
- **Claude Code bias.** Current reference implementations target Claude Code; adaptation to other platforms requires translation work.

---

## Version & Roadmap

### Current Version (v1.0)

The current implementation maps all five management principles: 11 specialized agents, 6 stage-gate hooks, 5-layer structured memory, and a three-layer orchestration model (Orchestrator → Domain → Execution). The `claude-template/` provides out-of-the-box project configuration, with `/init` adapting it to your stack.

### Gaps from the Ideal Architecture

1. **Context transfer overhead.** While sub-agents pass context between each other, each agent must still re-read the specific files within its scope, consuming more context than traditional single-session approaches.
2. **Time overhead.** Multi-agent scheduling, review, and confirmation steps take more time than traditional methods. Under DeepSeek V4 API testing, a high-level requirement averages 20-40 minutes end-to-end.
3. **Claude Code compatibility.** Architectures created via the template occasionally freeze in Claude Code's visual plugin or app — the UI becomes unresponsive while the AI has actually completed the task, requiring a manual refresh or restart.
4. **Incomplete init automation.** `/init` does not automatically discover and install relevant MCP tools, nor does it assess architecture compatibility. Performance may fall short of expectations when AI lacks sufficient tooling; users must proactively inform the architecture about required external tools and capability boundaries during or after initialization.
5. **Limited creative autonomy.** Each sub-agent strictly follows its defined objective and lacks awareness of the user's original intent. In scenarios requiring full AI ownership of a project (e.g., a non-programmer building a complete website from scratch), it may underperform compared to unconstrained conversation.
6. **High iteration cost.** The current architecture favors medium-to-large projects; the process overhead is excessive for small projects and rapid-iteration scenarios, yielding poor return on investment.

---

## Documentation

- [Governance Engineering — Theory & Design](../theory/governance-engineering-theory.en.md) — Methodology evolution, five design principles, three-layer architecture, model tiering & cost control, and relationship to Harness Engineering
- [Governance Engineering — UE5 Reference Implementation](../implementation/governance-engineering-ue5-impl.en.md) — Complete implementation guide with runnable Claude Code templates
- [Usage Guide](../usage/usage-guide.en.md) — Complete guide from setup to daily workflow
- [Architecture Analysis](../architecture/architecture-analysis.en.md) — In-depth architecture breakdown
- [CHANGELOG](../changelog/CHANGELOG.en.md) — Version history

---

## Example Projects

Projects built with Governance Engineering methodology:

| Project                                                | Stack                    | Description                                                   |
| ------------------------------------------------------ | ------------------------ | ------------------------------------------------------------- |
| [`task-board/`](../../task-board/)                     | React + FastAPI + SQLite | Full-stack task board with complete test suite                |
| [`turn-based-strategy/`](../../turn-based-strategy/)   | TypeScript + Canvas      | Turn-based strategy game with AI opponent & combat system     |
| [`markdown-ssg/`](../../markdown-ssg/)                 | Node.js CLI              | Static site generator compiling Markdown to HTML              |
| [`scientific-computing/`](../../scientific-computing/) | Python                   | ODE solver framework with parameter sweep engine              |
| [`ue5/`](../../ue5/)                                   | Unreal Engine 5.7 C++20  | UE5 test project with ue-mcp integration & Epic C++ standards |

All example projects were tested with **DeepSeek V4**, where Haiku maps to Flash, Sonnet to Flash[1m], and Opus to Pro[1m].

---

## Core Tenet

> Whenever you are unsatisfied with AI output, **do not ask "why can't AI do better" — ask "where is the gap in my AI governance architecture."** Because in a well-designed system, output quality should never depend on the capability of any single execution unit.

---

## A Note to Readers

My sincere thanks to everyone who reads and supports this project.

In November 2025, I was collaborating remotely on a series of SaaS projects. By February 2026, I began working extensively with Agent-driven AI development (Claude Code) and Harness Engineering. Through remote collaboration, I noticed something striking: without clear requirements, even an excellent developer produces code that doesn't fit the project's needs. And code isn't truly qualified until it passes tests, linters, and other rigid gates in a non-local staging environment.

When it comes to AI, most code quality issues share the same root cause. Beyond insufficient context, the requirements developers send to AI are simply not clear enough — and AI tends to "guess" rather than ask. The result: AI-generated code passes but misses the actual requirements, while also falling short on style consistency and accuracy. I realized immediately that, at least in how errors arise, AI and humans are fundamentally the same: facing the same problem yields entirely unpredictable, uncontrollable outcomes (a black-box process). And the solution to this human problem was proposed decades ago.

So in late April 2026, I began designing an "organizational AI architecture" — Governance Engineering. At its core, it treats AI as a miniature "outsourced dev team" rather than a "single code-editing tool." The AI operates within a complete process control system to ensure "everything executes as expected." Controlled processes counter uncontrollable output variance; the confirm module ensures AI truly understands requirements rather than guessing. This mirrors how real enterprises maintain code quality despite uneven employee capabilities: rigorous review, lint, and CI pipelines hold the quality baseline even when individual skill levels vary. The same applies to AI — even with a lower-quality model, a good process narrows the performance gap, keeping output at least close to par. The flip side is visible today: codebases at major companies that have been touched by under-skilled maintainers show a visible drop in quality — precisely the consequence of absent process constraints. In testing, this workflow perfectly executes the confirmed final requirements; when output doesn't match expectations, it's usually because confirm or plan conclusions weren't detailed enough, or the AI lacked relevant testing or development tools.

I am not a professional AI practitioner or architect. The original architecture took only a couple of days — a rough, minimal version. I lack both the capability and the resources to subject this architecture to lab-grade quality validation. The ideal implementation may require rethinking the entire Agent AI stack. I warmly welcome AI experts to fork or improve this project's architecture details, toward completing higher-quality tasks with less time and cost.

There may be earlier papers (I did see at least one similar article before the project was released) articulating the core ideas of Governance Engineering, but this is genuinely my independent creation. I also hope that these ideas can bring some academic value.

—— Saikel Orado Liu

---

## License

All documentation (`docs/`), Agent definitions, Skill definitions, Schema definitions, rule files, and all other content in this repository are licensed under [Apache License 2.0](../../LICENSE).

Copyright © 2026 GameGeek-Saikel
