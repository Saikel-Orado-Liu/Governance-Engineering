import { MapGrid } from '../map/MapGrid';
import { UnitManager } from './UnitManager';
import { Phase, canTransitionTo } from './PhaseTypes';
import { EnemyAI, type EnemyAction, type CombatFn, type SkillFunction } from './EnemyAI';
import { advanceCooldowns } from './AbilitySystem';
import type { Unit } from './Unit';

export type TurnState = Phase;

export type { EnemyAction };

export class TurnManager {
  private state: Phase = Phase.Deploy;
  private unitManager: UnitManager;
  private enemyAI: EnemyAI;
  onPhaseEnter: Set<(phase: Phase) => void> = new Set();
  onPhaseExit: Set<(phase: Phase) => void> = new Set();
  onPhaseChange: Set<(from: Phase, to: Phase) => void> = new Set();

  actionHistory: { from: Phase; to: Phase; timestamp: number }[] = [];

  /** Tracks units that have performed combat in the current PlayerCombat phase */
  private actedUnits: Set<Unit> = new Set();

  constructor(
    grid: MapGrid,
    unitManager: UnitManager,
    combatFn?: CombatFn,
    useSkillFn?: SkillFunction,
  ) {
    this.unitManager = unitManager;
    this.enemyAI = new EnemyAI(grid, unitManager, combatFn, undefined, useSkillFn);
  }

  getState(): TurnState {
    return this.state;
  }

  getCurrentTeam(): number {
    if (this.state === Phase.Deploy || this.state === Phase.PlayerMove || this.state === Phase.PlayerCombat) return 0;
    if (this.state === Phase.EnemyAI) return 1;
    return -1;
  }

  /** End player move phase and advance to PlayerCombat */
  endPlayerTurn(): EnemyAction[] {
    this.nextPhase(Phase.PlayerCombat);
    this.actedUnits.clear();
    return [];
  }

  /** End player combat phase and advance to EnemyAI */
  endPlayerCombat(): EnemyAction[] {
    // Game over check before advancing to EnemyAI
    if (this.isGameOver()) {
      this.nextPhase(Phase.End);
      return [];
    }
    this.nextPhase(Phase.EnemyAI);
    this.actedUnits.clear();
    const actions = this.enemyAI.executeTurn();
    if (this.isGameOver()) {
      this.nextPhase(Phase.End);
    }
    return actions;
  }

  /** Mark a unit as having acted (attacked) this combat phase */
  markUnitActed(unit: Unit): void {
    this.actedUnits.add(unit);
  }

  /** Check if a unit has already acted this combat phase */
  hasUnitActed(unit: Unit): boolean {
    return this.actedUnits.has(unit);
  }

  /** Check if all alive player units have acted */
  isAllUnitsActed(): boolean {
    const alivePlayerUnits = this.unitManager.getUnitsByTeam(0);
    return alivePlayerUnits.length > 0 && alivePlayerUnits.every(u =>
      this.actedUnits.has(u) || u.effects.some(e => e.type === 'skipTurn')
    );
  }

  /** Get remaining player units that can still act this combat phase (alive and not acted) */
  getRemainingCombatUnits(): Unit[] {
    return this.unitManager.getUnitsByTeam(0).filter(u =>
      u.isAlive() && !this.actedUnits.has(u) && !u.effects.some(e => e.type === 'skipTurn')
    );
  }

  startPlayerTurn(): void {
    advanceCooldowns(this.unitManager.getAllUnits());
    this.unitManager.getUnitsByTeam(0).forEach(u => u.movedThisTurn = false);
    this.nextPhase(Phase.PlayerMove);
  }

  isGameOver(): boolean {
    if (this.unitManager.getUnitsByTeam(0).length === 0) return true;
    if (this.unitManager.getUnitsByTeam(1).length === 0) return true;
    return false;
  }

  completeDeploy(): boolean {
    if (this.state !== Phase.Deploy) return false;
    this.nextPhase(Phase.PlayerMove);
    return true;
  }

  private nextPhase(target: Phase): void {
    if (!canTransitionTo(this.state, target)) return;
    const from = this.state;
    for (const cb of this.onPhaseExit) cb(from);
    this.state = target;
    for (const cb of this.onPhaseEnter) cb(target);
    for (const cb of this.onPhaseChange) cb(from, target);
    this.actionHistory.push({ from, to: target, timestamp: Date.now() });
  }
}
