---
name: phase-transition-rules
description: Phase (enum) transition validation — canTransitionTo must allow PlayerMove->EnemyAI (skip PlayerCombat in current loop)
type: project
---

The game's current loop skips `PlayerCombat` and goes directly `PlayerMove -> EnemyAI -> PlayerMove`. `canTransitionTo()` in PhaseTypes.ts has explicit special cases for the three non-adjacent transitions: `PlayerMove->EnemyAI`, `EnemyAI->PlayerMove`, and `End->PlayerMove` (restart).

**Why:** The phase sequence `[Deploy, PlayerMove, PlayerCombat, EnemyAI, End]` puts PlayerCombat between PlayerMove and EnemyAI, but the current game loop doesn't use PlayerCombat yet. Without the special case, `nextPhase()` would abort any transition.

**How to apply:** When adding new phase transitions in the future, add the corresponding case to `canTransitionTo()` and update this memory.
