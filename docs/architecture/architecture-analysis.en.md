# Governance Engineering — AI Architecture Analysis

——A complete analysis of the Three-Layer Orchestration Model, Agent Matrix, Communication Protocols, and Model Tiering Cost Control

---

## 1. Design Philosophy: AI Is Not a Tool, It Is an Organization to Be Managed

### 1.1 Core Assumption

The default assumption of traditional AI-assisted development is: **AI is a tool** — give it good input (a prompt), it returns good output (code). The problem with this assumption is that it places all quality responsibility on two variables: the model's intelligence level and the quality of the prompt.

Governance Engineering makes a different assumption: **AI is an organization that needs to be managed**. Just as you would not expect 100 developers thrown into a room to naturally produce good code, you should not expect a single AI model to consistently produce high-quality code.

### 1.2 Paradigm Shift

| Dimension | Traditional AI Development | Governance Engineering |
|-----------|---------------------------|----------------------|
| AI Role | Code editing tool | Micro outsourced team |
| Quality Assurance | Relies on model capability and prompt技巧 | Relies on process constraints and organizational design |
| Failure Attribution | "Model not good enough" / "Wrong prompt" | "Where did the process leak?" |
| Scaling Method | Upgrade to a stronger model | Add more process stages |
| Knowledge Management | Conversation context (short-term) | Memory filesystem (long-term) |

### 1.3 Sources of Inspiration

Governance Engineering's design draws from five core principles of management science:

1. **Division of Labor** — Adam Smith, *The Wealth of Nations*: Break complex tasks into simple subtasks, each worker does one thing
2. **Standardized Process** — Frederick Taylor, *The Principles of Scientific Management*: Use standardized processes to eliminate variance from individual differences
3. **Institutionalized Knowledge** — Ikujiro Nonaka, *The Knowledge-Creating Company*: Convert tacit knowledge into explicit knowledge
4. **Requirements Clarity** — PMI Project Management framework: Unclear requirements are the primary cause of project failure
5. **Layered Review** — Deming PDCA Cycle: Set quality checkpoints at different levels

---

## 2. Three-Layer Architecture Model

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    L0: Orchestrator Layer                     │
│   Main Conversation AI — Pure Dispatcher                     │
│   Responsibilities: Understand Requirements → Fork SubAgent → Present Results │
│   Never: Read code, write code, execute searches              │
│   Model: Any (lower quality models are fine, does not perform core tasks)│
└──────────────────────┬──────────────────────────────────────┘
                       │ Fork / Delegate
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   confirm    │ │   explore     │ │    plan      │ │  developer   │
│  Requirement │ │   Code        │ │   Solution   │ │   Code       │
│  Confirmation│ │   Exploration │ │   Planning   │ │   Generation  │
│  model: haiku│ │ model: haiku │ │ model: sonnet│ │ model: sonnet│
│  trigger: entry│ │ trigger: auto│ │ trigger: auto│ │ trigger: auto│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  inspector   │ │    test      │ │  summarize   │ │   commit     │
│   Code       │ │   Test       │ │   Change     │ │   Commit     │
│   Review     │ │   Execution  │ │   Summary    │ │   Code       │
│ model: haiku │ │ model: haiku │ │ model: haiku │ │ model: haiku │
│ trigger: auto│ │ trigger: auto│ │ trigger: auto│ │ trigger: auto│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   refactor   │ │   optimize   │ │     sync     │
│   Health     │ │   Solution   │ │   Knowledge  │
│   Scan       │ │   Comparison │ │   Sync       │
│ model: sonnet│ │ model: sonnet│ │ model: haiku │
│ trigger: manual│ │ trigger: manual│ │ trigger: manual│
└──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 L2: Knowledge Base Layer                      │
│  Filesystem — Module Cards / Standards Rule Set / Agent Memory│
│  Pure data, no logic execution                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Details

#### L0: Orchestrator Layer

**Role**: Team Lead / Project Manager

**Core Constraints**:
- Never directly execute code operations (Read / Edit / Write / Grep on Source/)
- Never perform code review or code search
- Only: Understand requirements → Judge complexity → Select path → Fork Agent → Present results

**Why this design**:
If the Orchestrator could read and write code itself, it would tend to "do it yourself" — and this would degrade into the traditional single-agent mode. Enforcing "dispatch only, never execute" is the first gate of quality assurance in Governance Engineering.

#### L1: Execution Layer (Specialized Agents)

**8 Pipeline Agents** (auto-triggered):
| Agent | Trigger Condition | Default Model | Core Responsibility |
|-------|-------------------|---------------|-------------------|
| confirm | Every task entry | haiku | Rephrase requirements, identify ambiguities, wait for confirmation |
| explore | Auto-triggered on standard path | haiku | Search codebase, analyze impact scope |
| plan | After explore completes | sonnet | Generate implementation plan, list files to modify |
| developer | After plan is approved | sonnet | Execute code modifications, self-check compilation |
| inspector | After developer completes | haiku | Independent blind review of code changes |
| test | After inspector passes | haiku | Run test suites, verify boundary conditions |
| summarize | After test completes | haiku | Generate change summary |
| commit | After summarize completes | haiku | Format commit message and commit |

**3 Offline Agents** (manually triggered):
| Agent | Trigger Condition | Default Model | Core Responsibility |
|-------|-------------------|---------------|-------------------|
| refactor | `/refactor` command | sonnet | Full codebase health scan |
| optimize | `/optimize` command | sonnet | Multi-solution comparison analysis |
| sync | `/sync` command or auto | haiku | Sync knowledge base after manual edits |

#### L2: Knowledge Base Layer

**Directory Structure**:
```
docs/ai/
├── modules/        # Module cards (one YAML per module)
├── standards/      # Coding Standards Rule Set
├── architecture.md # Architecture constraint rules
└── coding-standards.md # Code style rules

.claude/agent-memory/
├── orchestrator/   # Orchestrator memory
├── summarize/      # Summary history
└── sync/           # Sync logs
```

---

## 3. Agent Role Matrix

### 3.1 Model Allocation Strategy

Governance Engineering's model allocation follows the **"Capability-Match to Task"** principle:

```
High-value tasks → High-quality model (sonnet/opus)
  ├── plan (solution design)
  ├── developer (code generation)
  ├── refactor (health scan)
  └── optimize (solution comparison)

Low-value tasks → Lightweight model (haiku)
  ├── confirm (requirement rephrasing)
  ├── explore (code search)
  ├── inspector (code review)
  ├── test (test execution)
  ├── summarize (change summary)
  ├── commit (commit message)
  └── sync (knowledge sync)
```

**Token Cost Savings Estimate**: If all steps use the same high-quality model, total cost is 100%; through tiered model allocation, an estimated 40-60% Token cost savings can be achieved (search and review are the most context-consuming steps but do not require the highest intelligence).

### 3.2 Permission Matrix

| Agent | Read | Write | Edit | Bash | Independent Context |
|-------|:----:|:-----:|:----:|:----:|:-----------------:|
| confirm | — | — | — | — | ✅ |
| explore | ✅ | — | — | ✅ | ✅ |
| plan | ✅ | — | — | — | ✅ |
| developer | ✅ | ✅ | ✅ | ✅ | ✅ |
| inspector | ✅ | — | — | — | ✅ |
| test | ✅ | — | — | ✅ | ✅ |
| summarize | ✅ | — | — | — | ✅ |
| commit | — | — | — | ✅ | ✅ |
| refactor | ✅ | ✅ | ✅ | ✅ | ✅ |
| optimize | ✅ | — | — | — | ✅ |
| sync | ✅ | ✅ | — | — | ✅ |

**Key Design Points**:
- **inspector does not see plan's output** — This is the "blind review" mechanism, ensuring the reviewer is not guided by the solution document
- **developer does not see inspector's review checklist** — Prevents the developer from preemptively working around review points
- **All Agents have independent context** — Each Fork has its own context window

---

## 4. Communication Protocols & Data Flow

### 4.1 Data Transfer Method

Agents do not talk to each other directly. All communication is conducted through **YAML Schema files**:

```
confirm → confirm_result.yaml
explore → explore_report.yaml
plan → plan_result.yaml
developer → developer_result.yaml
inspector → inspector_report.yaml
test → test_report.yaml
summarize → change_summary.yaml
```

### 4.2 Transfer Invariants

1. **Reference, don't inline.** Agents pass file paths between each other, not file contents
2. **Structured output.** All Agent outputs must conform to YAML Schema format
3. **TASK DATA markers.** Each Agent's input data is wrapped with `<!-- TASK DATA -->` markers to prevent prompt injection
4. **Pass only necessary information.** The Orchestrator only passes the downstream data needed by the current Agent, not the full conversation history

### 4.3 Data Flow Diagram

**Standard Path**:
```
User Request
  → [confirm] → confirm_result.yaml
    → [explore] → explore_report.yaml
      → [plan] → plan_result.yaml
        → [developer] → developer_result.yaml + code changes
          → [inspector] → inspector_report.yaml
            → [test] → test_report.yaml
              → [summarize] → change_summary.yaml
                → [commit] → git commit
```

**Simplified Path** (`simplicity_score >= 70`):
```
User Request
  → [confirm] → confirm_result.yaml
    → [developer] → developer_result.yaml + code changes
      → [summarize] → change_summary.yaml
        → [commit] → git commit
```

### 4.4 Context Isolation Mechanism

Each SubAgent receives an independent context window when Forked:

```
Main Conversation Context (Orchestrator)
  ├── User requirement description
  ├── confirm_result summary
  └── Results display
      │
      ├── [SubAgent 1 Independent Context]
      │   ├── That Agent's task instructions
      │   ├── Relevant file contents (loaded on demand)
      │   └── YAML output
      │
      ├── [SubAgent 2 Independent Context]
      │   ├── That Agent's task instructions
      │   ├── Upstream Agent's output (structured)
      │   └── YAML output
      │
      ...
```

**Benefits**:
- Main conversation context usage < 40%, avoids attention dilution from long context
- Each Agent's context is highly focused, containing no irrelevant information
- Upstream Agent's "thought process" does not contaminate downstream Agent's context

---

## 5. Model Tiering & Cost Control

### 5.1 Model Tiering Strategy

Governance Engineering tiers models into three levels by task complexity, with different Agents assigned on demand:

```
High-value tasks → High-quality model (sonnet/opus)
  ├── plan (solution design)
  ├── developer (code generation)
  ├── refactor (health scan)
  └── optimize (solution comparison)

Low-value tasks → Lightweight model (haiku)
  ├── confirm (requirement restatement)
  ├── explore (code search)
  ├── inspector (code review)
  ├── test (test execution)
  ├── summarize (change summary)
  ├── commit (commit message)
  └── sync (knowledge sync)
```

### 5.2 Difference from Conventional Approaches

Conventional Skill approaches use a unified model for all conversation stages — file search, requirement confirmation, and code generation all consume the same cost tier. Governance Engineering's separation of agent responsibilities enables each stage to select the appropriate model tier: search and review tasks use low-cost models, while core tasks like code generation call on high-capability models. This fundamentally reduces overall expenses without relying on a single-model compromise.

> [!NOTE]
> Specific cost savings ratios have not been verified through controlled experiments. The model tiering strategy is derived from architectural design principles. Quantitative validation is future work.

---

## 6. Dual-Path Dispatch Mechanism

### 6.1 Path Selection

After understanding the requirements, the Orchestrator evaluates `simplicity_score` (0-100):

| Score Range | Path | Description |
|-------------|------|-------------|
| 70-100 | simple | Skip explore + plan, go directly to developer |
| 0-69 | standard | Full six-stage pipeline |

### 6.2 Evaluation Dimensions

```
simplicity_score = weighted_average(
  file_change_count weight 30%,
  logic_complexity weight 25%,
  technical_risk weight 20%,
  dependency_relationships weight 15%,
  user_clarity weight 10%
)
```

### 6.3 Examples

| Requirement | Score | Path |
|-------------|-------|------|
| "Change the port from 3000 to 8080" | 95 | simple |
| "Fix typo in README" | 98 | simple |
| "Add login functionality with JWT" | 45 | standard |
| "Refactor the payment module" | 20 | standard |

---

## 7. Memory Architecture

### 7.1 Five-Layer Memory Hierarchy

```
┌──────────────────────────────────────┐
│ L0: Conversation Context              │  ← Current session, volatile
├──────────────────────────────────────┤
│ L1: Agent Memory (.claude/agent-memory/) │  ← Cross-session, team shared
├──────────────────────────────────────┤
│ L2: Module Cards (docs/ai/modules/)    │  ← Structured, machine-first
├──────────────────────────────────────┤
│ L3: Standards Rules (docs/ai/standards/)│  ← Auto-verifiable
├──────────────────────────────────────┤
│ L4: Git History (git log)              │  ← Immutable, strongest traceability
└──────────────────────────────────────┘
```

### 7.2 Knowledge Self-Healing

The `/sync` command triggers the knowledge self-healing process:
1. Scan the Source/ directory structure
2. Compare against module cards in `docs/ai/modules/`
3. Detect inconsistencies → Automatically update module cards
4. Delete expired card entries
5. Report coverage change

---

## 8. Hook System

### 8.1 Three Types of Hooks

```
PreToolUse (Before Execution)
  ├── File size check (> 100KB warning)
  └── Permission validation

PostToolUse (After Execution)
  ├── Auto-trigger /sync after git commit
  └── Check related module cards after file modification

Notification (Notifications)
  ├── Documentation expiry reminder
  └── Health metric alert
```

### 8.2 Stage-Gates

```
Code Generation → [Gate 1: Lint] → [Gate 2: Compile] → [Gate 3: Test]
  → [Gate 4: Inspector] → [Gate 5: Doc Update Check] → Commit
```

Any gate not passed → Return to developer for modification → Maximum 3 retries → After exceeding → ESCALATE_TO_HUMAN

---

## 9. Fault Tolerance & Recovery

### 9.1 Four-Level Failure Handling

| Level | Handling Method |
|-------|----------------|
| L1: First Failure | Auto retry, maintain same context |
| L2: Second Failure | Expand context, load more relevant files |
| L3: Third Failure | Decompose task or switch Agent model |
| L4: Fourth Failure | ESCALATE_TO_HUMAN |

### 9.2 Recovery Checkpoints

The pipeline sets checkpoints at the following positions, allowing recovery from any checkpoint without rerunning everything:

- `confirm_result.yaml` — After requirement confirmation
- `plan_result.yaml` — After solution approval
- `developer_result.yaml` — After code generation
- `test_report.yaml` — After tests pass

---

## 10. Comparison with Traditional Approaches

| Dimension | Vibe Coding | Spec Coding | Harness Engineering | **Governance Engineering** |
|-----------|-------------|-------------|---------------------|---------------------------|
| AI Role | Code generator | Spec implementer | Constrained tool | Managed team |
| Requirements Management | Prompt | Spec document | Rule configuration | confirm → plan double verification |
| Quality Assurance | Luck-based | Spec-dependent | Hook-dependent | Process + Review + Hooks dependent |
| Knowledge Management | None | None | None | 5-layer Memory |
| Cost Optimization | None | None | None | Model Tiering & Cost Control |
| Applicable Scale | Personal small projects | Small to medium projects | Medium to large projects | Medium to large projects |
| Learning Cost | Low | Medium | Medium-High | Medium-High |
| One-shot Tasks | ✅ Suitable | ✅ Suitable | ❌ Overkill | ❌ Overkill |
