import { MapGrid, GRID_SIZE } from '../map/MapGrid';
import { UnitManager } from './UnitManager';
import { executeCombat, type CombatResult } from './CombatSystem';
import type { Unit } from './Unit';

const DIRECTION_OFFSETS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

export type TurnState = 'player' | 'enemy' | 'gameOver';

export interface EnemyAction {
  unit: Unit;
  action: 'move' | 'attack' | 'idle';
  target?: Unit;
  from?: { row: number; col: number };
  to?: { row: number; col: number };
  combatResult?: CombatResult;
}

type CombatFn = (attacker: Unit, defender: Unit, unitManager: UnitManager) => CombatResult;

export class TurnManager {
  private state: TurnState = 'player';
  private grid: MapGrid;
  private unitManager: UnitManager;
  private combatFn: CombatFn;

  constructor(
    grid: MapGrid,
    unitManager: UnitManager,
    combatFn?: CombatFn,
  ) {
    this.grid = grid;
    this.unitManager = unitManager;
    this.combatFn = combatFn ?? executeCombat;
  }

  getState(): TurnState {
    return this.state;
  }

  getCurrentTeam(): number {
    if (this.state === 'player') return 0;
    if (this.state === 'enemy') return 1;
    return -1;
  }

  endPlayerTurn(): EnemyAction[] {
    this.state = 'enemy';
    const actions: EnemyAction[] = [];
    const enemyUnits = this.unitManager.getUnitsByTeam(1);

    for (const enemyUnit of enemyUnits) {
      // Skip if unit was already removed during this turn
      if (!enemyUnit.isAlive()) {
        continue;
      }

      const playerUnits = this.unitManager.getUnitsByTeam(0);
      if (playerUnits.length === 0) {
        this.state = 'gameOver';
        break;
      }

      // Find nearest player unit by Manhattan distance
      const nearest = this.findNearest(enemyUnit, playerUnits);
      if (!nearest) {
        actions.push({ unit: enemyUnit, action: 'idle' });
        continue;
      }

      // Check if already adjacent to any enemy
      const adjacent = this.getAdjacentEnemies(enemyUnit);
      if (adjacent.length > 0) {
        // Attack lowest HP adjacent target
        const target = adjacent.sort((a, b) => a.hp - b.hp)[0];
        const combatResult = this.combatFn(enemyUnit, target, this.unitManager);
        actions.push({
          unit: enemyUnit,
          action: 'attack',
          target,
          combatResult,
        });

        // Check game over after attack
        if (this.isGameOver()) {
          break;
        }
      } else {
        // Try to move one step closer to nearest enemy
        const moveTarget = this.findBestAdjacentMove(enemyUnit, nearest);
        if (moveTarget) {
          const from = { row: enemyUnit.row, col: enemyUnit.col };
          this.unitManager.moveUnit(enemyUnit, moveTarget.row, moveTarget.col);
          actions.push({
            unit: enemyUnit,
            action: 'move',
            from,
            to: moveTarget,
          });

          // After moving, check if now adjacent to any enemy
          const postAdjacent = this.getAdjacentEnemies(enemyUnit);
          if (postAdjacent.length > 0) {
            const target = postAdjacent.sort((a, b) => a.hp - b.hp)[0];
            const combatResult = this.combatFn(enemyUnit, target, this.unitManager);
            actions.push({
              unit: enemyUnit,
              action: 'attack',
              target,
              combatResult,
            });

            if (this.isGameOver()) {
              break;
            }
          }
        } else {
          actions.push({ unit: enemyUnit, action: 'idle' });
        }
      }
    }

    // Final game over check
    if (this.state !== 'gameOver') {
      this.isGameOver();
    }

    return actions;
  }

  startPlayerTurn(): void {
    if (this.state === 'enemy') {
      this.state = 'player';
    }
  }

  isGameOver(): boolean {
    if (this.unitManager.getUnitsByTeam(0).length === 0) {
      this.state = 'gameOver';
      return true;
    }
    if (this.unitManager.getUnitsByTeam(1).length === 0) {
      this.state = 'gameOver';
      return true;
    }
    return false;
  }

  private findNearest(unit: Unit, targets: Unit[]): Unit | null {
    if (targets.length === 0) return null;
    return targets.reduce((best, curr) => {
      const bestDist = Math.abs(best.row - unit.row) + Math.abs(best.col - unit.col);
      const currDist = Math.abs(curr.row - unit.row) + Math.abs(curr.col - unit.col);
      return currDist < bestDist ? curr : best;
    });
  }

  private getAdjacentEnemies(unit: Unit): Unit[] {
    const enemies: Unit[] = [];
    for (const [dr, dc] of DIRECTION_OFFSETS) {
      const nr = unit.row + dr;
      const nc = unit.col + dc;
      const target = this.unitManager.getUnitAt(nr, nc);
      if (target && target.team !== unit.team && target.isAlive()) {
        enemies.push(target);
      }
    }
    return enemies;
  }

  private findBestAdjacentMove(unit: Unit, target: Unit): { row: number; col: number } | null {
    let best: { row: number; col: number } | null = null;
    let bestDist = Infinity;

    for (const [dr, dc] of DIRECTION_OFFSETS) {
      const nr = unit.row + dr;
      const nc = unit.col + dc;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (!this.grid.isPassable(nr, nc)) continue;
      if (this.unitManager.isOccupied(nr, nc)) continue;

      const dist = Math.abs(nr - target.row) + Math.abs(nc - target.col);
      if (dist < bestDist) {
        bestDist = dist;
        best = { row: nr, col: nc };
      }
    }

    return best;
  }
}
