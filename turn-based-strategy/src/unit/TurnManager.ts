import { MapGrid } from '../map/MapGrid';
import { UnitManager } from './UnitManager';
import { Phase, canTransitionTo } from './PhaseTypes';
import { EnemyAI, type EnemyAction, type CombatFn } from './EnemyAI';

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

  constructor(
    grid: MapGrid,
    unitManager: UnitManager,
    combatFn?: CombatFn,
  ) {
    this.unitManager = unitManager;
    this.enemyAI = new EnemyAI(grid, unitManager, combatFn);
  }

  getState(): TurnState {
    return this.state;
  }

  getCurrentTeam(): number {
    if (this.state === Phase.Deploy || this.state === Phase.PlayerMove || this.state === Phase.PlayerCombat) return 0;
    if (this.state === Phase.EnemyAI) return 1;
    return -1;
  }

  endPlayerTurn(): EnemyAction[] {
    this.nextPhase(Phase.EnemyAI);
    const actions = this.enemyAI.executeTurn();
    if (this.isGameOver()) {
      this.nextPhase(Phase.End);
    }
    return actions;
  }

  startPlayerTurn(): void {
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
