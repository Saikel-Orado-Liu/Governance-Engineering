import { MapGrid, GRID_SIZE } from '../map/MapGrid';
import { UnitManager } from './UnitManager';
import { executeCombat } from './CombatSystem';
import type { CombatResult } from './CombatSystem';
import type { Unit } from './Unit';
import { Pathfinding } from '../core/Pathfinding';
import { DIRECTION_OFFSETS } from '../core/Coordinate';

export interface EnemyAction {
  unit: Unit;
  action: 'move' | 'attack' | 'idle';
  target?: Unit;
  from?: { row: number; col: number };
  to?: { row: number; col: number };
  combatResult?: CombatResult;
}

export type CombatFn = (attacker: Unit, defender: Unit, unitManager: UnitManager) => CombatResult;

export class EnemyAI {
  private grid: MapGrid;
  private unitManager: UnitManager;
  private combatFn: CombatFn;
  private pathfinding: Pathfinding | null = null;

  constructor(
    grid: MapGrid,
    unitManager: UnitManager,
    combatFn?: CombatFn,
    pathfinding?: Pathfinding,
  ) {
    this.grid = grid;
    this.unitManager = unitManager;
    this.combatFn = combatFn ?? executeCombat;
    if (pathfinding) {
      this.pathfinding = pathfinding;
    }
  }

  private getPathfinding(): Pathfinding {
    if (!this.pathfinding) {
      this.pathfinding = new Pathfinding(
        this.grid,
        (r, c) => this.unitManager.isOccupied(r, c),
      );
    }
    return this.pathfinding;
  }

  executeTurn(): EnemyAction[] {
    const actions: EnemyAction[] = [];
    const enemyUnits = this.unitManager.getUnitsByTeam(1);

    for (const enemyUnit of enemyUnits) {
      if (!enemyUnit.isAlive()) {
        continue;
      }

      const playerUnits = this.unitManager.getUnitsByTeam(0);
      if (playerUnits.length === 0) {
        break;
      }

      // Step 1: Check attack range — attack if any player within attackRange
      const inRange = this.getEnemiesInRange(enemyUnit, playerUnits);
      if (inRange.length > 0) {
        const target = inRange.sort((a, b) => a.hp - b.hp)[0];
        const combatResult = this.combatFn(enemyUnit, target, this.unitManager);
        actions.push({
          unit: enemyUnit,
          action: 'attack',
          target,
          combatResult,
        });
        continue; // Attack only — no movement this turn
      }

      // Step 2: No targets in range — pathfind toward nearest player
      const nearest = this.findNearest(enemyUnit, playerUnits);
      if (!nearest) {
        actions.push({ unit: enemyUnit, action: 'idle' });
        continue;
      }

      const moved = this.tryPathfindMove(enemyUnit, nearest, actions);
      if (!moved) {
        actions.push({ unit: enemyUnit, action: 'idle' });
        continue;
      }

      // Step 3: After moving, check attack range again
      const postInRange = this.getEnemiesInRange(
        enemyUnit,
        this.unitManager.getUnitsByTeam(0),
      );
      if (postInRange.length > 0) {
        const target = postInRange.sort((a, b) => a.hp - b.hp)[0];
        const combatResult = this.combatFn(enemyUnit, target, this.unitManager);
        actions.push({
          unit: enemyUnit,
          action: 'attack',
          target,
          combatResult,
        });
      }
    }

    return actions;
  }

  /**
   * Attempt A* pathfinding movement toward the target.
   * Falls back to single-step greedy movement if pathfinding fails.
   * Returns true if movement occurred (any number of steps).
   */
  private tryPathfindMove(
    enemyUnit: Unit,
    nearest: Unit,
    actions: EnemyAction[],
  ): boolean {
    const pf = this.getPathfinding();

    // Find all reachable cells within moveRange
    const reachable = pf.findPathInRange(enemyUnit.row, enemyUnit.col, enemyUnit.moveRange);
    if (reachable.length === 0) {
      return false;
    }

    // Pick destination closest (Manhattan) to the nearest player
    const destination = this.pickClosestDestination(reachable, nearest);
    if (!destination) {
      return false;
    }

    // Find full A* path to destination
    const path = pf.findPath(enemyUnit.row, enemyUnit.col, destination.row, destination.col);
    if (!path || path.length === 0) {
      // Fallback: single-step adjacent move
      return this.tryAdjacentMove(enemyUnit, nearest, actions);
    }

    // Multi-step movement along the path
    for (const step of path) {
      const from = { row: enemyUnit.row, col: enemyUnit.col };
      const moved = this.unitManager.moveUnit(enemyUnit, step.row, step.col);
      if (!moved) {
        // Stuck mid-path — stop moving
        break;
      }
      actions.push({
        unit: enemyUnit,
        action: 'move',
        from,
        to: step,
      });
    }

    return true;
  }

  /**
   * Single-step greedy adjacent move (original behavior, kept for fallback).
   */
  private tryAdjacentMove(
    unit: Unit,
    target: Unit,
    actions: EnemyAction[],
  ): boolean {
    const moveTarget = this.findBestAdjacentMove(unit, target);
    if (!moveTarget) {
      return false;
    }
    const from = { row: unit.row, col: unit.col };
    this.unitManager.moveUnit(unit, moveTarget.row, moveTarget.col);
    actions.push({
      unit,
      action: 'move',
      from,
      to: moveTarget,
    });
    return true;
  }

  /**
   * Pick the reachable cell with minimum Manhattan distance to the target.
   */
  private pickClosestDestination(
    cells: { row: number; col: number }[],
    target: Unit,
  ): { row: number; col: number } | null {
    if (cells.length === 0) return null;
    return cells.reduce((best, curr) => {
      const bestDist = Math.abs(best.row - target.row) + Math.abs(best.col - target.col);
      const currDist = Math.abs(curr.row - target.row) + Math.abs(curr.col - target.col);
      return currDist < bestDist ? curr : best;
    });
  }

  /**
   * Get all enemy units within this unit's attack range.
   * Uses Manhattan distance ≤ unit.attackRange.
   */
  getEnemiesInRange(unit: Unit, targets: Unit[]): Unit[] {
    return targets.filter(target => {
      const dist = Math.abs(unit.row - target.row) + Math.abs(unit.col - target.col);
      return dist <= unit.attackRange;
    });
  }

  /**
   * Find the best destination cell reachable within moveRange,
   * closest (Manhattan) to the given target.
   */
  findPathDestination(unit: Unit, target: Unit): { row: number; col: number } | null {
    const pf = this.getPathfinding();
    const reachable = pf.findPathInRange(unit.row, unit.col, unit.moveRange);
    if (reachable.length === 0) return null;
    return this.pickClosestDestination(reachable, target);
  }

  findNearest(unit: Unit, targets: Unit[]): Unit | null {
    if (targets.length === 0) return null;
    return targets.reduce((best, curr) => {
      const bestDist = Math.abs(best.row - unit.row) + Math.abs(best.col - unit.col);
      const currDist = Math.abs(curr.row - unit.row) + Math.abs(curr.col - unit.col);
      return currDist < bestDist ? curr : best;
    });
  }

  getAdjacentEnemies(unit: Unit): Unit[] {
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

  findBestAdjacentMove(unit: Unit, target: Unit): { row: number; col: number } | null {
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
